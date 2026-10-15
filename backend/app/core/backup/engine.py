"""Run backups, keep history honest, apply retention, test restores.

A run is only "ok" when, for every chosen destination, the encrypted file was
uploaded AND downloaded back with a matching SHA-256 — and the dump itself
passed ``pg_restore --list``. Retention never deletes anything on a
destination unless that destination's new backup was just verified.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import secrets
import shutil
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text

from app.core.backup import crypto, pgtools, providers, store

logger = logging.getLogger(__name__)

BDT = timezone(timedelta(hours=6))
WORK = Path(tempfile.gettempdir()) / "abo-backup"
LOCAL_TTL = 30 * 60
HEALTHY_HOURS = 26
_lock = asyncio.Lock()
_local_files: dict[str, dict[str, Any]] = {}  # run_id → {path, name, admin_id, expires}

_NAME_RE = re.compile(r"^abo-db-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})-")


class BackupError(Exception):
    def __init__(self, message: str, message_bn: str, status: int = 400):
        super().__init__(message)
        self.message_bn, self.status = message_bn, status


def _bn(exc: Exception) -> str:
    return getattr(exc, "message_bn", None) or "অজানা সমস্যা — System Events দেখুন।"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(1 << 20):
            h.update(chunk)
    return h.hexdigest()


def backup_name(trigger: str, now: datetime | None = None) -> str:
    t = (now or datetime.now(timezone.utc)).astimezone(BDT)
    return f"{providers.FILE_PREFIX}{t:%Y-%m-%d_%H%M}-{trigger}.abobak"


def production_conn() -> pgtools.Conn:
    from app.core.config import settings

    return pgtools.parse_url(os.environ.get("BACKUP_DATABASE_URL", "").strip() or settings.DATABASE_URL)


# ── database facts ───────────────────────────────────────────────────────────

async def _app_db_facts() -> tuple[int, dict[str, int]]:
    """Server major version + exact row count of every public table."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as s:
        major = int((await s.execute(text("SHOW server_version_num"))).scalar_one()) // 10000
        tables = [r[0] for r in await s.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))]
        counts = {}
        for t in tables:
            counts[t] = int((await s.execute(text(f'SELECT count(*) FROM public."{t.replace(chr(34), "")}"'))).scalar_one())
    return major, counts


async def _target_counts(conn: pgtools.Conn) -> dict[str, int]:
    import asyncpg

    c = await asyncpg.connect(host=conn.host, port=conn.port, user=conn.user, password=conn.password,
                              database=conn.dbname, ssl="require" if conn.sslmode == "require" else None,
                              statement_cache_size=0, timeout=30)
    try:
        tables = [r["tablename"] for r in await c.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")]
        return {t: int(await c.fetchval(f'SELECT count(*) FROM public."{t.replace(chr(34), "")}"')) for t in tables}
    finally:
        await c.close()


# ── history helpers (each write in its own short session) ───────────────────

async def _save_run(run: dict[str, Any]) -> None:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as s:
        await store.upsert_run(s, run)
        await s.commit()


def _settle_stale(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """A run left "running" by a restart/redeploy is shown as failed, not forever-running."""
    # Single worker (render.yaml --workers 1): if this process holds no lock, nothing is running.
    for r in history:
        if r.get("status") == "running" and not _lock.locked():
            r.update(status="failed", error_bn="সার্ভার রিস্টার্ট হওয়ায় কাজটি মাঝপথে থেমে গেছে।")
    return history


def _make_provider(dest: dict[str, Any], secret: dict[str, Any]) -> providers.Provider:
    dest_id = dest["id"]

    async def save(cfg_up: dict[str, Any], sec_up: dict[str, Any]) -> None:
        from app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as s:
            if cfg_up:
                cfg = await store.get_config(s)
                for d in cfg["destinations"]:
                    if d["id"] == dest_id:
                        d.setdefault("cfg", {}).update(cfg_up)
                await store.put_config(s, cfg)
            if sec_up:
                sec = await store.get_secrets(s)
                sec.setdefault(dest_id, {}).update(sec_up)
                await store.put_secrets(s, sec)
            await s.commit()

    return providers.make(dest["kind"], dict(dest.get("cfg") or {}), dict(secret or {}), save)


# ── retention ────────────────────────────────────────────────────────────────

def _stamp(name: str) -> datetime | None:
    m = _NAME_RE.match(name)
    if not m:
        return None
    y, mo, d, hh, mm = map(int, m.groups())
    return datetime(y, mo, d, hh, mm, tzinfo=BDT)


def retention_plan(files: list[dict[str, Any]], policy: dict[str, int], keep_name: str) -> list[dict[str, Any]]:
    """Return the files to delete. Keeps the newest file of each of the last
    N days / ISO weeks / months; files with unknown names are never touched."""
    dated = sorted(((f, _stamp(f["name"])) for f in files if _stamp(f["name"])), key=lambda x: x[1], reverse=True)
    keep: set[str] = {keep_name}
    for bucket_of, limit in ((lambda t: t.date(), policy.get("daily", 14)),
                             (lambda t: tuple(t.isocalendar()[:2]), policy.get("weekly", 8)),
                             (lambda t: (t.year, t.month), policy.get("monthly", 6))):
        seen: list[Any] = []
        for f, t in dated:
            b = bucket_of(t)
            if b in seen:
                continue
            if len(seen) >= max(0, int(limit)):
                break
            seen.append(b)
            keep.add(f["name"])
    return [f for f, _ in dated if f["name"] not in keep]


# ── one backup run ───────────────────────────────────────────────────────────

def is_running() -> bool:
    return _lock.locked()


async def run_backup(trigger: str, dest_ids: list[str] | None = None, *, keep_local: bool = False,
                     admin_id: str | None = None, run_id: str | None = None) -> dict[str, Any]:
    if _lock.locked():
        raise BackupError("backup already running", "একটি backup এখন চলছে — শেষ হলে আবার চেষ্টা করুন।", 409)
    async with _lock:
        return await _run(trigger, dest_ids, keep_local, admin_id, run_id)


async def _run(trigger: str, dest_ids: list[str] | None, keep_local: bool, admin_id: str | None,
               run_id: str | None) -> dict[str, Any]:
    from app.core.database import AsyncSessionLocal

    run: dict[str, Any] = {"id": run_id or uuid.uuid4().hex[:12], "trigger": trigger, "status": "running",
                           "stage": "start", "started_at": store.now_iso(), "destinations": [], "by": admin_id}
    WORK.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="run-", dir=WORK))
    dump, enc = work / "db.dump", work / "db.abobak"
    try:
        async with AsyncSessionLocal() as s:
            cfg, secs, keys = await store.get_config(s), await store.get_secrets(s), await store.get_keys(s)
        if not keys:
            raise BackupError("encryption key not set", "আগে Backup পাসওয়ার্ড (এনক্রিপশন কী) সেট করুন।")
        dests = [d for d in cfg["destinations"]
                 if (d["id"] in dest_ids if dest_ids is not None else d.get("enabled", True))]
        if not dests and not keep_local:
            raise BackupError("no destination", "কোনো ড্রাইভ যুক্ত/চালু নেই — আগে একটি ড্রাইভ যোগ করুন।")
        run["name"] = backup_name(trigger)
        await _save_run({**run, "stage": "dump"})

        major, counts = await _app_db_facts()
        bin_dir = await pgtools.ensure_tools(major)
        await pgtools.pg_dump(bin_dir, production_conn(), dump)
        toc = await pgtools.pg_restore_list(bin_dir, dump)
        run.update(db_major=major, toc=toc, rows=counts, row_total=sum(counts.values()),
                   dump_size=dump.stat().st_size, dump_sha256=sha256_file(dump), stage="encrypt")

        bundle = crypto.KeyBundle(keys["public_b64"], keys["sealed_private"])
        meta = {"name": run["name"], "db_major": major, "rows": counts, "dump_sha256": run["dump_sha256"],
                "created_at": run["started_at"], "toc": toc}
        await asyncio.to_thread(_encrypt_file, dump, enc, bundle, meta)
        dump.unlink(missing_ok=True)
        run.update(size=enc.stat().st_size, sha256=sha256_file(enc), key_id=bundle.fingerprint, stage="upload")
        await _save_run(run)

        for d in dests:
            run["destinations"].append(await _to_destination(d, secs.get(d["id"], {}), enc, run, cfg["retention"]))
            await _save_run(run)

        if keep_local:
            local = WORK / f"{secrets.token_urlsafe(24)}.abobak"
            shutil.move(str(enc), local)
            os.chmod(local, 0o600)
            _local_files[run["id"]] = {"path": local, "name": run["name"], "admin_id": admin_id,
                                       "expires": time.time() + LOCAL_TTL}
            run["local"] = {"ok": True, "expires_in": LOCAL_TTL}

        oks = [x["ok"] for x in run["destinations"]] + ([True] if keep_local else [])
        run["status"] = "ok" if oks and all(oks) else ("partial" if any(oks) else "failed")
        if run["status"] != "ok":
            failed = [x for x in run["destinations"] if not x["ok"]]
            run["error_bn"] = "; ".join(f"{x['label']}: {x.get('error_bn', '')}" for x in failed)[:500]
    except Exception as exc:  # noqa: BLE001 — every failure must land in history, never vanish
        run.update(status="failed", error_bn=_bn(exc), error=str(exc)[:500])
        logger.warning("backup %s failed: %s", run["id"], exc)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    run.update(stage="done", finished_at=store.now_iso())
    _cleanup_local()
    await _save_run(_public_run(run))
    if run["status"] != "ok":
        _alert(run)
    return run


def _encrypt_file(src: Path, dst: Path, bundle: crypto.KeyBundle, meta: dict[str, Any]) -> None:
    with open(src, "rb") as fi, open(dst, "wb") as fo:
        crypto.encrypt_stream(fi, fo, bundle, meta)


def _public_run(run: dict[str, Any]) -> dict[str, Any]:
    """History keeps no technical error text (it may mention hosts)."""
    return {k: v for k, v in run.items() if k != "error"}


async def _to_destination(dest: dict[str, Any], secret: dict[str, Any], enc: Path, run: dict[str, Any],
                          policy: dict[str, int]) -> dict[str, Any]:
    res: dict[str, Any] = {"dest_id": dest["id"], "kind": dest["kind"], "label": dest.get("label") or dest["kind"],
                           "ok": False, "verified": False}
    check = enc.with_suffix(".check")
    try:
        prov = _make_provider(dest, secret)
        up = await prov.upload(enc, run["name"])
        res.update(file_id=up["id"], size=up.get("size"))
        await prov.download(up["id"], check)  # read it back: proves the cloud copy is intact
        if sha256_file(check) != run["sha256"]:
            raise BackupError("uploaded copy differs", "ড্রাইভে রাখা কপি মেলেনি (ক্ষতিগ্রস্ত) — আবার চেষ্টা করুন।")
        res.update(ok=True, verified=True)
        try:
            doomed = retention_plan(await prov.list(), policy, run["name"])
            for f in doomed:
                await prov.delete(f["id"])
            res["deleted_old"] = len(doomed)
        except Exception as exc:  # noqa: BLE001 — cleanup failure must not fail a good backup
            res["retention_error_bn"] = _bn(exc)
    except Exception as exc:  # noqa: BLE001
        res.update(error_bn=_bn(exc), error=str(exc)[:300])
    finally:
        check.unlink(missing_ok=True)
    await _mark_destination(dest["id"], res)
    return res


async def _mark_destination(dest_id: str, res: dict[str, Any]) -> None:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as s:
        cfg = await store.get_config(s)
        for d in cfg["destinations"]:
            if d["id"] == dest_id:
                d["last"] = {"ok": res["ok"], "at": store.now_iso(), "error_bn": res.get("error_bn", "")}
        await store.put_config(s, cfg)
        await s.commit()


_last_email = {"at": 0.0}
EMAIL_GAP = 6 * 3600


def _alert(run: dict[str, Any]) -> None:
    try:
        if time.time() - _last_email["at"] > EMAIL_GAP:
            _last_email["at"] = time.time()
            asyncio.get_running_loop().create_task(_email_alert(run))
    except RuntimeError:
        pass
    try:
        from app.core.ops_events import _persist_system_event

        _persist_system_event("backup_failed" if run["status"] == "failed" else "backup_partial",
                              "error" if run["status"] == "failed" else "warning",
                              f"Database backup {run['status']}: {run.get('error_bn', '')}"[:500],
                              {"run_id": run["id"], "trigger": run["trigger"]})
    except Exception:  # noqa: BLE001
        pass


async def _email_alert(run: dict[str, Any]) -> None:
    """Plain Bangla e-mail to the owner when a backup fails (at most every 6 h)."""
    try:
        from app.core.config import settings
        from app.core.email import send_email

        to = settings.ADMIN_NOTIFY_EMAIL or getattr(settings, "BUSINESS_EMAIL", "")
        if not to:
            return
        word = "ব্যর্থ হয়েছে" if run["status"] == "failed" else "আংশিক হয়েছে"
        html = (f"<p>আজকের ডাটাবেস backup <b>{word}</b>।</p><p>কারণ: {run.get('error_bn') or '—'}</p>"
                f"<p>Admin → ডাটাবেস Backup পাতায় গিয়ে “এখনই Backup নিন” চাপুন। সমস্যা থাকলে ডেভেলপারকে জানান।</p>")
        await send_email(to, f"⚠️ ABO Backup {word}", html, retries=1)
    except Exception as exc:  # noqa: BLE001
        logger.warning("backup alert e-mail failed: %s", exc)


# ── built-in scheduler ───────────────────────────────────────────────────────
# Render free sleeps when idle, but the existing cron-job.org ping keeps it
# awake, so a light in-process check every 10 minutes is enough — no extra
# cron job for the owner. /api/v1/backup/cron stays as an optional backup trigger.

CHECK_EVERY = 600


async def scheduler_loop() -> None:
    from app.core.database import AsyncSessionLocal

    await asyncio.sleep(120)  # let the app finish starting
    while True:
        try:
            async with AsyncSessionLocal() as s:
                cfg, hist = await store.get_config(s), _settle_stale(await store.get_history(s))
            if not _lock.locked() and is_due(cfg, hist):
                await run_backup("auto")
        except Exception as exc:  # noqa: BLE001 — the loop must never die
            logger.warning("backup scheduler check failed: %s", exc)
        await asyncio.sleep(CHECK_EVERY)


def start_scheduler() -> asyncio.Task | None:
    from app.core.config import settings

    if settings.APP_ENV.strip().lower() != "production" or os.environ.get("BACKUP_SCHEDULER", "on") == "off":
        return None
    return asyncio.get_running_loop().create_task(scheduler_loop())


# ── local downloads ──────────────────────────────────────────────────────────

def _cleanup_local() -> None:
    now = time.time()
    for rid, f in list(_local_files.items()):
        if f["expires"] < now:
            Path(f["path"]).unlink(missing_ok=True)
            _local_files.pop(rid, None)


def take_local(run_id: str, admin_id: str) -> dict[str, Any]:
    _cleanup_local()
    f = _local_files.get(run_id)
    if not f or f.get("admin_id") != admin_id or not Path(f["path"]).exists():
        raise BackupError("download expired", "ডাউনলোডের সময় শেষ — আবার “কম্পিউটারে নিন” চাপুন।", 404)
    return f


# ── schedule ─────────────────────────────────────────────────────────────────

def is_due(cfg: dict[str, Any], history: list[dict[str, Any]], now: datetime | None = None) -> bool:
    sch = cfg.get("schedule") or {}
    if not sch.get("enabled") or not cfg.get("destinations"):
        return False
    now = (now or datetime.now(timezone.utc)).astimezone(BDT)
    slot = now.replace(hour=int(sch.get("hour", 3)), minute=int(sch.get("minute", 30)), second=0, microsecond=0)
    if now < slot:
        slot -= timedelta(days=1)
    since = [r for r in history if r.get("trigger") == "auto" and _ts(r) >= slot]
    if any(r.get("status") in ("ok", "partial") for r in since):
        return False
    if len(since) >= 3:  # three tries per day, then wait for tomorrow (and the red alert)
        return False
    return not since or (now - max(_ts(r) for r in since)) > timedelta(minutes=50)


def _ts(r: dict[str, Any]) -> datetime:
    try:
        return datetime.fromisoformat(r["started_at"]).astimezone(BDT)
    except (KeyError, ValueError):
        return datetime.min.replace(tzinfo=BDT)


def next_run(cfg: dict[str, Any], now: datetime | None = None) -> str | None:
    sch = cfg.get("schedule") or {}
    if not sch.get("enabled") or not cfg.get("destinations"):
        return None
    now = (now or datetime.now(timezone.utc)).astimezone(BDT)
    slot = now.replace(hour=int(sch.get("hour", 3)), minute=int(sch.get("minute", 30)), second=0, microsecond=0)
    if slot <= now:
        slot += timedelta(days=1)
    return slot.isoformat()


def health(cfg: dict[str, Any], history: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    """Honest status for the dashboard: only a verified cloud copy counts."""
    now = now or datetime.now(timezone.utc)
    good = next((r for r in history if any(d.get("verified") for d in r.get("destinations", []))), None)
    age_h = (now - _ts(good)).total_seconds() / 3600 if good else None
    last = history[0] if history else None
    ok = bool(good) and age_h is not None and age_h <= HEALTHY_HOURS
    if not cfg.get("destinations"):
        msg = "কোনো ড্রাইভ যুক্ত নেই — Backup চালু হয়নি।"
    elif not good:
        msg = "এখনো কোনো যাচাই-করা backup নেই।"
    elif not ok:
        msg = f"শেষ সফল backup {int(age_h)} ঘণ্টা আগে — নতুন backup হচ্ছে না।"
    else:
        msg = "Backup ঠিক আছে।"
    return {"ok": ok, "message_bn": msg, "last_success_at": good.get("finished_at") if good else None,
            "next_run_at": next_run(cfg, now),
            "last_success_age_hours": round(age_h, 1) if age_h is not None else None,
            "last_status": last.get("status") if last else None, "schedule_enabled": bool(cfg["schedule"].get("enabled")),
            "running": is_running()}


# ── verify & restore test ────────────────────────────────────────────────────

async def fetch_file(dest_id: str, file_id: str, dest: Path) -> None:
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as s:
        cfg, secs = await store.get_config(s), await store.get_secrets(s)
    d = next((x for x in cfg["destinations"] if x["id"] == dest_id), None)
    if not d:
        raise BackupError("unknown destination", "এই ড্রাইভটি আর যুক্ত নেই।", 404)
    await _make_provider(d, secs.get(dest_id, {})).download(file_id, dest)


async def verify_file(path: Path, passphrase: str | None, expected_sha: str | None = None) -> dict[str, Any]:
    """Integrity: sha256 (if known) → header → (with passphrase) decrypt + pg_restore --list."""
    out: dict[str, Any] = {"sha256": sha256_file(path), "size": path.stat().st_size}
    if expected_sha and out["sha256"] != expected_sha:
        raise BackupError("checksum mismatch", "ফাইলের checksum মেলেনি — ফাইলটি ক্ষতিগ্রস্ত বা বদলানো।")
    with open(path, "rb") as f:
        try:
            header, _ = crypto.read_header(f)
        except crypto.BackupCryptoError as exc:
            raise BackupError(str(exc), "এটি ABO-র backup ফাইল নয় বা ফাইলটি ক্ষতিগ্রস্ত।") from exc
    out["meta"] = {k: header.get("meta", {}).get(k) for k in ("name", "db_major", "created_at", "rows", "toc")}
    out["key_id"] = header.get("kid")
    if passphrase:
        dump = path.with_suffix(".dump")
        try:
            await asyncio.to_thread(_decrypt_file, path, dump, passphrase)
            bin_dir = await pgtools.ensure_tools(int(out["meta"].get("db_major") or 17))
            out["toc"] = await pgtools.pg_restore_list(bin_dir, dump)
            out["decrypted"] = True
        finally:
            dump.unlink(missing_ok=True)
    return out


def _decrypt_file(src: Path, dst: Path, passphrase: str) -> dict[str, Any]:
    try:
        with open(src, "rb") as fi, open(dst, "wb") as fo:
            return crypto.decrypt_stream(fi, fo, passphrase)
    except crypto.BackupCryptoError as exc:
        dst.unlink(missing_ok=True)
        msg = "Backup পাসওয়ার্ড ভুল।" if "passphrase" in str(exc) else "ফাইলটি ক্ষতিগ্রস্ত বা বদলানো হয়েছে।"
        raise BackupError(str(exc), msg) from exc


def guard_target(target_url: str) -> pgtools.Conn:
    """The ONLY gate before any restore: refuse anything that is (or may be) production."""
    target = pgtools.parse_url(target_url)
    if pgtools.same_database(target, production_conn()):
        raise BackupError("target is production", "এটি আসল (production) ডাটাবেস — এখানে পরীক্ষা-restore করা যাবে না। "
                          "আলাদা একটি পরীক্ষার ডাটাবেস দিন।", 403)
    from app.core.config import settings

    if pgtools.same_database(target, pgtools.parse_url(settings.DATABASE_URL)):
        raise BackupError("target is production", "এটি আসল (production) ডাটাবেস — এখানে restore করা যাবে না।", 403)
    return target


async def restore_test(path: Path, passphrase: str, target_url: str, expected_sha: str | None = None) -> dict[str, Any]:
    target = guard_target(target_url)
    info = await verify_file(path, None, expected_sha)
    dump = path.with_suffix(".dump")
    try:
        meta = await asyncio.to_thread(_decrypt_file, path, dump, passphrase)
        bin_dir = await pgtools.ensure_tools(int(meta.get("db_major") or 17))
        await pgtools.pg_restore_list(bin_dir, dump)
        errors = await pgtools.pg_restore_into(bin_dir, target, dump)
    finally:
        dump.unlink(missing_ok=True)
    got = await _target_counts(target)
    want: dict[str, int] = meta.get("rows") or {}
    tables = []
    for t in sorted(set(want) | set(got)):
        w, g = want.get(t), got.get(t)
        tables.append({"table": t, "backup": w, "restored": g,
                       "ok": g is not None and (w is None or abs(g - w) <= 2)})
    missing = [t["table"] for t in tables if t["restored"] is None]
    ok = not missing and all(t["ok"] for t in tables if t["backup"] is not None)
    return {"ok": ok, "tables": tables, "missing": missing, "errors": errors, "backup": info["meta"],
            "target": f"{target.host}:{target.port}/{target.dbname}"}
