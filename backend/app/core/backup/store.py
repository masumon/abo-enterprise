"""Backup state in the ``settings`` table (no schema change needed).

  backup.config   — schedule, retention, destinations (non-secret parts)
  backup.secrets  — per-destination tokens/keys, Fernet-encrypted (SECRET_KEY)
  backup.keys     — public key + passphrase-sealed private key
  backup.history  — last runs, newest first

All rows are ``is_secret`` (hidden from the settings API) and the ``backup.``
prefix is write-protected in routes/settings.py and the settings restore.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.totp_crypto import decrypt_totp_secret, encrypt_totp_secret
from app.models.models import Setting

K_CONFIG, K_SECRETS, K_KEYS, K_HISTORY = "backup.config", "backup.secrets", "backup.keys", "backup.history"
K_APPS = "backup.app_clients"  # one-click OAuth clients uploaded in the admin (encrypted)
HISTORY_MAX = 150

DEFAULT_CONFIG: dict[str, Any] = {
    "schedule": {"enabled": False, "hour": 3, "minute": 30},  # Bangladesh time
    "retention": {"daily": 14, "weekly": 8, "monthly": 6},
    "destinations": [],
    "github": {"enabled": True},  # GitHub Actions extra copy (workflow asks /backup/github-enabled)
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _row(db: AsyncSession, key: str) -> Setting | None:
    return (await db.execute(select(Setting).where(Setting.key == key, Setting.is_deleted == False))).scalar_one_or_none()  # noqa: E712


async def _get(db: AsyncSession, key: str, default: Any, encrypted: bool = False) -> Any:
    row = await _row(db, key)
    if not row or not row.value:
        return default
    try:
        raw = decrypt_totp_secret(row.value) if encrypted else row.value
        return json.loads(raw)
    except (ValueError, TypeError):
        return default


async def _put(db: AsyncSession, key: str, value: Any, encrypted: bool = False) -> None:
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if encrypted:
        raw = encrypt_totp_secret(raw)
    row = await _row(db, key)
    if row:
        row.value, row.is_secret, row.is_editable = raw, True, False
    else:
        db.add(Setting(key=key, value=raw, data_type="json", is_secret=True, is_editable=False,
                       description="Database backup (managed by Admin → Backup)"))


async def get_config(db: AsyncSession) -> dict[str, Any]:
    cfg = await _get(db, K_CONFIG, {})
    out = json.loads(json.dumps(DEFAULT_CONFIG))
    out.update({k: v for k, v in cfg.items() if k in out})
    out["schedule"] = {**DEFAULT_CONFIG["schedule"], **(cfg.get("schedule") or {})}
    out["retention"] = {**DEFAULT_CONFIG["retention"], **(cfg.get("retention") or {})}
    out["github"] = {**DEFAULT_CONFIG["github"], **(cfg.get("github") or {})}
    return out


async def put_config(db: AsyncSession, cfg: dict[str, Any]) -> None:
    await _put(db, K_CONFIG, cfg)


async def get_secrets(db: AsyncSession) -> dict[str, dict[str, Any]]:
    return await _get(db, K_SECRETS, {}, encrypted=True)


async def put_secrets(db: AsyncSession, secrets: dict[str, dict[str, Any]]) -> None:
    await _put(db, K_SECRETS, secrets, encrypted=True)


async def get_keys(db: AsyncSession) -> dict[str, Any] | None:
    keys = await _get(db, K_KEYS, None)
    return keys if keys and keys.get("public_b64") else None


async def put_keys(db: AsyncSession, keys: dict[str, Any]) -> None:
    await _put(db, K_KEYS, keys)


async def get_history(db: AsyncSession) -> list[dict[str, Any]]:
    h = await _get(db, K_HISTORY, [])
    return h if isinstance(h, list) else []


async def upsert_run(db: AsyncSession, run: dict[str, Any]) -> None:
    hist = [r for r in await get_history(db) if r.get("id") != run["id"]]
    hist.insert(0, run)
    hist.sort(key=lambda r: r.get("started_at", ""), reverse=True)
    await _put(db, K_HISTORY, hist[:HISTORY_MAX])


async def get_app_clients(db: AsyncSession) -> dict[str, dict[str, str]]:
    return await _get(db, K_APPS, {}, encrypted=True)


async def put_app_clients(db: AsyncSession, apps: dict[str, dict[str, str]]) -> None:
    await _put(db, K_APPS, apps, encrypted=True)
