"""Database backup: encryption, S3 signing, production guard, retention, schedule, full run."""
import asyncio
import datetime as dt
import io
from pathlib import Path

import pytest

from app.core.backup import crypto, engine, pgtools, providers, store
from app.core.rbac import has_permission

PASS = "correct horse battery staple"


@pytest.fixture(scope="module")
def bundle():
    return crypto.generate_keys(PASS)


def _enc(bundle, data: bytes) -> bytes:
    out = io.BytesIO()
    crypto.encrypt_stream(io.BytesIO(data), out, bundle, {"name": "x"})
    return out.getvalue()


def test_roundtrip_multi_chunk(bundle):
    data = b"A" * (crypto.CHUNK * 2 + 123)
    out = io.BytesIO()
    meta = crypto.decrypt_stream(io.BufferedReader(io.BytesIO(_enc(bundle, data))), out, PASS)
    assert out.getvalue() == data and meta == {"name": "x"}


def test_wrong_passphrase_and_short_passphrase(bundle):
    with pytest.raises(crypto.BackupCryptoError):
        crypto.decrypt_stream(io.BufferedReader(io.BytesIO(_enc(bundle, b"hi"))), io.BytesIO(), "wrong passphrase!!")
    with pytest.raises(crypto.BackupCryptoError):
        crypto.generate_keys("short")
    assert crypto.check_passphrase(bundle, PASS) and not crypto.check_passphrase(bundle, "nope nope nope")


def test_tamper_and_truncation_detected(bundle):
    blob = bytearray(_enc(bundle, b"B" * (crypto.CHUNK + 10)))
    bad = bytes(blob[:-5] + bytes([blob[-5] ^ 1]) + blob[-4:])
    with pytest.raises(crypto.BackupCryptoError):
        crypto.decrypt_stream(io.BufferedReader(io.BytesIO(bad)), io.BytesIO(), PASS)
    one_chunk_cut = bytes(blob[: len(blob) - (4 + 10 + 16)])  # drop the final chunk entirely
    with pytest.raises(crypto.BackupCryptoError):
        crypto.decrypt_stream(io.BufferedReader(io.BytesIO(one_chunk_cut)), io.BytesIO(), PASS)


def test_server_key_cannot_decrypt_without_passphrase(bundle):
    # The stored public key + sealed private key are useless without the passphrase.
    with pytest.raises(crypto.BackupCryptoError):
        crypto.unseal_private(bundle.sealed_private, "")


def test_sigv4_matches_aws_reference_vector():
    # AWS docs "GET Object" example (Signature Version 4, examplebucket, 2013-05-24).
    h = providers.sigv4_headers(
        "GET", "https://examplebucket.s3.amazonaws.com/test.txt", "us-east-1",
        "AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        {"Range": "bytes=0-9"}, now=dt.datetime(2013, 5, 24, tzinfo=dt.timezone.utc))
    assert h["Authorization"].endswith("Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41")


def test_public_https_only():
    assert providers.check_public_https("https://s3.example.com/") == "https://s3.example.com"
    for bad in ("http://s3.example.com", "https://localhost", "https://10.0.0.5", "https://169.254.169.254"):
        with pytest.raises(providers.ProviderError):
            providers.check_public_https(bad)


def test_parse_url_switches_to_session_pooler_and_guard(monkeypatch):
    prod = "postgresql+asyncpg://postgres.abcref:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    c = pgtools.parse_url(prod)
    assert c.port == 5432 and c.sslmode == "require" and c.password == "pw"
    monkeypatch.setenv("BACKUP_DATABASE_URL", prod)
    for same in (prod.replace(":6543", ":5432"), "postgresql://postgres:x@db.abcref.supabase.co:5432/postgres"):
        with pytest.raises(engine.BackupError):
            engine.guard_target(same)
    assert engine.guard_target("postgresql://postgres.otherref:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres")


def test_retention_keeps_daily_weekly_monthly():
    days = [dt.datetime(2026, 10, 15, 3, 30, tzinfo=engine.BDT) - dt.timedelta(days=i) for i in range(120)]
    files = [{"id": str(i), "name": engine.backup_name("auto", d)} for i, d in enumerate(days)]
    doomed = {f["name"] for f in engine.retention_plan(files, {"daily": 14, "weekly": 8, "monthly": 6}, files[0]["name"])}
    kept = [f for f in files if f["name"] not in doomed]
    assert files[0] in kept and all(f in kept for f in files[:14])
    assert 14 < len(kept) <= 14 + 8 + 6
    unknown = [{"id": "u", "name": "abo-db-something-else.abobak"}]
    assert engine.retention_plan(unknown, {"daily": 1, "weekly": 0, "monthly": 0}, "x") == []


def test_is_due_and_health():
    cfg = {"schedule": {"enabled": True, "hour": 3, "minute": 30}, "destinations": [{"id": "d"}]}
    now = dt.datetime(2026, 10, 15, 4, 0, tzinfo=engine.BDT)
    assert engine.is_due(cfg, [], now)
    ok_run = {"trigger": "auto", "status": "ok", "started_at": now.replace(minute=31).isoformat(),
              "finished_at": now.isoformat(), "destinations": [{"verified": True}]}
    assert not engine.is_due(cfg, [ok_run], now)
    assert not engine.is_due({**cfg, "schedule": {"enabled": False}}, [], now)
    h = engine.health(cfg, [ok_run], now)
    assert h["ok"] is True
    h = engine.health(cfg, [ok_run], now + dt.timedelta(hours=30))
    assert h["ok"] is False and "ঘণ্টা" in h["message_bn"]
    assert engine.health(cfg, [{"status": "ok", "destinations": []}], now)["ok"] is False  # local-only never counts


def test_only_super_admin_can_manage_backups():
    assert has_permission("super_admin", "backup.manage")
    for role in ("admin", "editor", "viewer"):
        assert not has_permission(role, "backup.manage")


# ── full run with fakes (no database, no network) ───────────────────────────

class FakeDrive(providers.Provider):
    kind = "fake"
    files: dict[str, bytes] = {}
    corrupt = False

    async def check(self):
        return "fake"

    async def upload(self, path, name):
        data = Path(path).read_bytes()
        FakeDrive.files[name] = data[:-1] + b"X" if FakeDrive.corrupt else data
        return {"id": name, "size": len(data)}

    async def download(self, file_id, dest):
        Path(dest).write_bytes(FakeDrive.files[file_id])

    async def delete(self, file_id):
        FakeDrive.files.pop(file_id, None)

    async def list(self):
        return [{"id": n, "name": n, "size": len(b)} for n, b in FakeDrive.files.items()]


class _Session:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def commit(self):
        return None


@pytest.fixture
def fake_env(monkeypatch, bundle, tmp_path):
    state = {"config": {**store.DEFAULT_CONFIG, "schedule": {"enabled": True, "hour": 3, "minute": 30},
                        "destinations": [{"id": "d1", "kind": "fake", "label": "Fake", "enabled": True, "cfg": {}}]},
             "secrets": {"d1": {}}, "history": [],
             "keys": {"public_b64": bundle.public_b64, "sealed_private": bundle.sealed_private}}

    async def get_config(db):
        return state["config"]

    async def put_config(db, cfg):
        state["config"] = cfg

    async def get_secrets(db):
        return state["secrets"]

    async def get_keys(db):
        return state["keys"]

    async def upsert_run(db, run):
        state["history"] = [r for r in state["history"] if r["id"] != run["id"]]
        state["history"].insert(0, run)

    for name, fn in (("get_config", get_config), ("put_config", put_config), ("get_secrets", get_secrets),
                     ("get_keys", get_keys), ("upsert_run", upsert_run)):
        monkeypatch.setattr(store, name, fn)
    import app.core.database as database
    monkeypatch.setattr(database, "AsyncSessionLocal", lambda: _Session())
    monkeypatch.setitem(providers.KINDS, "fake", FakeDrive)

    async def facts():
        return 17, {"orders": 5, "customers": 3}

    async def tools(major):
        return tmp_path

    async def dump(bin_dir, conn, out):
        Path(out).write_bytes(b"PGDMP fake dump " * 1000)

    async def toc(bin_dir, path):
        return {"tables": 2, "table_data": 2, "indexes": 0, "constraints": 0, "sequences": 0}

    monkeypatch.setattr(engine, "_app_db_facts", facts)
    monkeypatch.setattr(pgtools, "ensure_tools", tools)
    monkeypatch.setattr(pgtools, "pg_dump", dump)
    monkeypatch.setattr(pgtools, "pg_restore_list", toc)
    monkeypatch.setattr(engine, "WORK", tmp_path / "work")
    monkeypatch.setenv("BACKUP_DATABASE_URL", "postgresql://u:p@db.example.com:5432/postgres")
    FakeDrive.files, FakeDrive.corrupt = {}, False
    return state


def test_full_run_uploads_verifies_and_records(fake_env):
    run = asyncio.run(engine.run_backup("manual"))
    assert run["status"] == "ok", run
    d = run["destinations"][0]
    assert d["ok"] and d["verified"] and run["row_total"] == 8
    assert fake_env["history"][0]["status"] == "ok" and "error" not in fake_env["history"][0]
    assert fake_env["config"]["destinations"][0]["last"]["ok"] is True
    # the stored file decrypts back to the dump with the passphrase
    blob = FakeDrive.files[run["name"]]
    out = io.BytesIO()
    meta = crypto.decrypt_stream(io.BufferedReader(io.BytesIO(blob)), out, PASS)
    assert out.getvalue().startswith(b"PGDMP") and meta["rows"]["orders"] == 5


def test_corrupted_upload_is_reported_not_hidden(fake_env):
    FakeDrive.corrupt = True
    run = asyncio.run(engine.run_backup("auto"))
    assert run["status"] == "failed" and not run["destinations"][0]["verified"]
    assert fake_env["history"][0]["status"] == "failed"
    assert engine.health(fake_env["config"], fake_env["history"])["ok"] is False


def test_no_key_or_no_drive_fails_clearly(fake_env):
    fake_env["keys"] = None
    run = asyncio.run(engine.run_backup("manual"))
    assert run["status"] == "failed" and "পাসওয়ার্ড" in run["error_bn"]


def test_local_download_only_for_same_admin(fake_env):
    run = asyncio.run(engine.run_backup("local", [], keep_local=True, admin_id="a1"))
    assert run["status"] == "ok"
    assert Path(engine.take_local(run["id"], "a1")["path"]).exists()
    with pytest.raises(engine.BackupError):
        engine.take_local(run["id"], "someone-else")


def test_cron_rejects_bad_token():
    from fastapi.testclient import TestClient
    from app.main import app

    r = TestClient(app).get("/api/v1/backup/cron?token=wrong")
    assert r.status_code == 403


def test_backup_settings_are_write_protected():
    from app.api.v1.routes.settings import _is_protected_setting_key

    assert _is_protected_setting_key("backup.keys") and _is_protected_setting_key("backup.secrets")
    assert not _is_protected_setting_key("site_name")
