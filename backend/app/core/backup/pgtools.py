"""pg_dump / pg_restore without Docker or apt.

Render's native Python runtime has no PostgreSQL client. On first use we
download the official-source portable build from theseus-rs/postgresql-binaries
(GitHub releases), refuse it unless its SHA-256 matches the value pinned below,
and extract only ``bin/pg_dump``, ``bin/pg_restore`` and ``lib/`` into a temp
dir. The major version is matched to the server (pg_dump must not be older).

Credentials never touch the command line or logs: they go through libpq
environment variables (PGPASSWORD etc.) of the child process only.

Set ``BACKUP_PG_BIN_DIR`` to use locally installed binaries instead
(e.g. ``C:\\Program Files\\PostgreSQL\\17\\bin`` on a dev PC).
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
import shutil
import tarfile
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit

import httpx

_RELEASE = "https://github.com/theseus-rs/postgresql-binaries/releases/download/{v}/postgresql-{v}-x86_64-unknown-linux-gnu.tar.gz"
# major → (exact version, sha256 of the tar.gz) — verified 2026-10-15 against
# the release's published .sha256 file and an independent download.
PINNED: dict[int, tuple[str, str]] = {
    17: ("17.11.0", "b7a1ba6bae6499d8296e3e81b0171eecfd1766ca9aaa0057e41ad3e844e5e2e0"),
    18: ("18.6.0", "bb3d09f876b2383e25a8c9ce09e32d185a03656a23d074f5195542b1b1b3ca61"),
}
_ROOT = Path(tempfile.gettempdir()) / "abo-pgbin"
_lock = asyncio.Lock()


class PgToolError(Exception):
    def __init__(self, message: str, message_bn: str):
        super().__init__(message)
        self.message_bn = message_bn


@dataclass
class Conn:
    host: str
    port: int
    user: str
    password: str
    dbname: str
    sslmode: str

    def env(self) -> dict[str, str]:
        return {"PGHOST": self.host, "PGPORT": str(self.port), "PGUSER": self.user, "PGPASSWORD": self.password,
                "PGDATABASE": self.dbname, "PGSSLMODE": self.sslmode, "PGCONNECT_TIMEOUT": "20"}

    def identity(self) -> tuple[str, int, str, str]:
        """What makes two URLs point at the same database (used by the production guard)."""
        return (self.host.lower(), self.port, self.dbname, _project_ref(self))


def _project_ref(c: Conn) -> str:
    # Supabase pooler users look like "postgres.<project-ref>"; direct hosts like db.<ref>.supabase.co
    if "." in c.user:
        return c.user.split(".", 1)[1].lower()
    m = re.match(r"db\.([a-z0-9]+)\.supabase\.co$", c.host.lower())
    return m.group(1) if m else ""


def parse_url(url: str, *, session_pooler: bool = True) -> Conn:
    """postgres URL (asyncpg/SQLAlchemy style accepted) → libpq parameters.

    Supabase's transaction pooler (port 6543) cannot run pg_dump, so a pooler
    URL is switched to the session pooler (5432) on the same host."""
    url = (url or "").strip()
    url = re.sub(r"^postgres(ql)?(\+\w+)?://", "postgresql://", url)
    parts = urlsplit(url)
    if parts.scheme != "postgresql" or not parts.hostname:
        raise PgToolError("invalid database URL", "ডাটাবেস URL ঠিক নেই — postgresql://… ধরনের হতে হবে।")
    host = parts.hostname
    port = parts.port or 5432
    if session_pooler and host.endswith("pooler.supabase.com") and port == 6543:
        port = 5432
    q = dict(p.split("=", 1) for p in parts.query.split("&") if "=" in p)
    supa = "supabase.co" in host or "supabase.com" in host
    sslmode = q.get("sslmode") or ("require" if supa or host not in ("localhost", "127.0.0.1") else "prefer")
    return Conn(host=host, port=port, user=unquote(parts.username or "postgres"),
                password=unquote(parts.password or ""), dbname=(parts.path or "/postgres").lstrip("/") or "postgres",
                sslmode=sslmode)


def same_database(a: Conn, b: Conn) -> bool:
    ia, ib = a.identity(), b.identity()
    if ia[3] and ib[3]:
        return ia[3] == ib[3]  # Supabase: the project ref decides (many projects share one pooler host)
    if ia[3] or ib[3]:
        # one side names a project, the other doesn't: same host+db is still treated as the same database
        return ia[0] == ib[0] and ia[2] == ib[2]
    return ia[:3] == ib[:3]


def _local_dir() -> Path | None:
    d = os.environ.get("BACKUP_PG_BIN_DIR", "").strip()
    return Path(d) if d else None


def _exe(bin_dir: Path, name: str) -> Path:
    for cand in (bin_dir / name, bin_dir / f"{name}.exe"):
        if cand.exists():
            return cand
    raise PgToolError(f"{name} not found in {bin_dir}", f"{name} পাওয়া যায়নি।")


async def ensure_tools(major: int) -> Path:
    """Return the bin dir with pg_dump/pg_restore for this server major."""
    local = _local_dir()
    if local:
        _exe(local, "pg_dump")
        return local
    if major not in PINNED:
        raise PgToolError(f"PostgreSQL {major} is not supported yet",
                          f"ডাটাবেসের ভার্সন PostgreSQL {major} — এর জন্য backup টুল এখনো যোগ করা হয়নি।")
    version, sha = PINNED[major]
    target = _ROOT / version
    bin_dir = target / "bin"
    async with _lock:
        if (bin_dir / "pg_dump").exists() and (bin_dir / "pg_restore").exists():
            return bin_dir
        await asyncio.to_thread(_ROOT.mkdir, parents=True, exist_ok=True)
        archive = _ROOT / f"pg-{version}.tar.gz"
        url = _RELEASE.format(v=version)
        h = hashlib.sha256()
        try:
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                async with client.stream("GET", url) as r:
                    r.raise_for_status()
                    with open(archive, "wb") as f:
                        async for chunk in r.aiter_bytes(1 << 16):
                            h.update(chunk)
                            f.write(chunk)
        except httpx.HTTPError as exc:
            raise PgToolError(f"download failed: {exc}", "backup টুল ডাউনলোড করা যায়নি — একটু পরে আবার চেষ্টা করুন।") from exc
        if h.hexdigest() != sha:
            archive.unlink(missing_ok=True)
            raise PgToolError("pg tools checksum mismatch — refusing to run",
                              "backup টুলের নিরাপত্তা-যাচাই (checksum) মেলেনি — নিরাপত্তার জন্য চালানো হয়নি।")
        await asyncio.to_thread(_extract, archive, target)
        archive.unlink(missing_ok=True)
    return bin_dir


def _extract(archive: Path, target: Path) -> None:
    tmp = target.with_name(target.name + ".part")
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    with tarfile.open(archive, "r:gz") as tar:
        members = []
        for m in tar.getmembers():
            rel = m.name.split("/", 1)[1] if "/" in m.name else ""
            if rel in ("bin/pg_dump", "bin/pg_restore") or rel.startswith("lib/"):
                m.name = rel
                members.append(m)
        tar.extractall(tmp, members=members, filter="data")
    for name in ("pg_dump", "pg_restore"):
        (tmp / "bin" / name).chmod(0o755)
    shutil.rmtree(target, ignore_errors=True)
    tmp.rename(target)


def _child_env(bin_dir: Path, conn: Conn | None) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    lib = bin_dir.parent / "lib"
    if lib.exists():
        env["LD_LIBRARY_PATH"] = f"{lib}:{env['LD_LIBRARY_PATH']}" if env.get("LD_LIBRARY_PATH") else str(lib)
    if conn:
        env.update(conn.env())
    return env


def _scrub(text: str, conn: Conn | None) -> str:
    text = (text or "").strip()
    if conn and conn.password:
        text = text.replace(conn.password, "***")
    return re.sub(r"postgres(ql)?://\S+", "postgresql://***", text)[-1500:]


async def _run(args: list[str], env: dict[str, str], conn: Conn | None, timeout: float) -> str:
    proc = await asyncio.create_subprocess_exec(*args, env=env, stdout=asyncio.subprocess.PIPE,
                                                stderr=asyncio.subprocess.PIPE)
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        proc.kill()
        raise PgToolError("timed out", "অনেক সময় লাগছে — কাজটি থামানো হয়েছে।") from exc
    if proc.returncode != 0:
        msg = _scrub(err.decode("utf-8", "replace"), conn)
        raise PgToolError(msg or f"exit {proc.returncode}", f"ডাটাবেস টুল ব্যর্থ হয়েছে: {msg[:300]}")
    return out.decode("utf-8", "replace")


async def pg_dump(bin_dir: Path, conn: Conn, out_file: Path, timeout: float = 1800) -> None:
    """Full schema + data of the app's ``public`` schema, custom format (-Fc)."""
    await _run([str(_exe(bin_dir, "pg_dump")), "--format=custom", "--compress=6", "--no-owner", "--no-privileges",
                "--schema=public", "--file", str(out_file)], _child_env(bin_dir, conn), conn, timeout)


async def pg_restore_list(bin_dir: Path, dump_file: Path) -> dict[str, int]:
    """Read the dump's table of contents — proves the file is a complete, readable dump."""
    out = await _run([str(_exe(bin_dir, "pg_restore")), "--list", str(dump_file)], _child_env(bin_dir, None), None, 300)
    counts = {"tables": 0, "table_data": 0, "indexes": 0, "constraints": 0, "sequences": 0}
    for line in out.splitlines():
        if line.startswith(";") or not line.strip():
            continue
        if " TABLE DATA " in line:
            counts["table_data"] += 1
        elif " TABLE " in line:
            counts["tables"] += 1
        elif " INDEX " in line:
            counts["indexes"] += 1
        elif " CONSTRAINT " in line or " FK CONSTRAINT " in line:
            counts["constraints"] += 1
        elif " SEQUENCE " in line:
            counts["sequences"] += 1
    if counts["tables"] == 0:
        raise PgToolError("dump has no tables", "backup ফাইলে কোনো টেবিল নেই — ফাইলটি অসম্পূর্ণ।")
    return counts


async def pg_restore_into(bin_dir: Path, conn: Conn, dump_file: Path, timeout: float = 3600) -> list[str]:
    """Restore into a (test) database. Callers MUST have run the production guard.

    Harmless errors (e.g. "schema public already exists" on a fresh Supabase
    project) must not abort the test, so pg_restore keeps going and the error
    lines are returned; success is judged afterwards by comparing row counts."""
    args = [str(_exe(bin_dir, "pg_restore")), "--no-owner", "--no-privileges", "--clean", "--if-exists",
            "--dbname", conn.dbname, str(dump_file)]
    proc = await asyncio.create_subprocess_exec(*args, env=_child_env(bin_dir, conn), stdout=asyncio.subprocess.PIPE,
                                                stderr=asyncio.subprocess.PIPE)
    try:
        _, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        proc.kill()
        raise PgToolError("timed out", "অনেক সময় লাগছে — কাজটি থামানো হয়েছে।") from exc
    lines = [ln for ln in _scrub(err.decode("utf-8", "replace"), conn).splitlines() if "error" in ln.lower()]
    if proc.returncode != 0 and not lines:
        raise PgToolError(f"pg_restore exit {proc.returncode}", "restore টুল ব্যর্থ হয়েছে।")
    return lines[:30]
