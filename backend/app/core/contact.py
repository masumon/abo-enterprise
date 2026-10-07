"""Customer-facing contact numbers, driven by the admin settings.

`contact_phone` and `whatsapp_number` live in the settings table (editable in
the admin panel). Outgoing customer SMS/e-mail text needs them in places that
have no DB session handy, so they are cached in-process: loaded once at
startup and refreshed whenever an admin saves either key (the API runs a single
worker, so the cache cannot go stale across processes). When nothing is set in
the admin panel we fall back to the deployment default in config.
"""
from __future__ import annotations

import logging
from typing import Iterable, Mapping

from app.core.config import settings

logger = logging.getLogger(__name__)

PHONE_KEY = "contact_phone"
WHATSAPP_KEY = "whatsapp_number"

_numbers: dict[str, str] = {PHONE_KEY: "", WHATSAPP_KEY: ""}


def _fallback() -> str:
    return (settings.WHATSAPP_NUMBER or "").strip()


def support_number() -> str:
    """Number to show in "Questions? Call …" style text."""
    return _numbers[PHONE_KEY] or _numbers[WHATSAPP_KEY] or _fallback()


def whatsapp_number() -> str:
    return _numbers[WHATSAPP_KEY] or _numbers[PHONE_KEY] or _fallback()


def update_from_items(items: Iterable[Mapping[str, str]]) -> None:
    """Apply saved settings (`[{"key": ..., "value": ...}]`) to the cache."""
    for item in items:
        key = item.get("key")
        if key in _numbers:
            _numbers[key] = (item.get("value") or "").strip()


async def load_from_db() -> None:
    """Best-effort startup load; never blocks or fails startup."""
    try:
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.models import Setting

        async with AsyncSessionLocal() as db:
            rows = (
                await db.execute(
                    select(Setting.key, Setting.value).where(
                        Setting.key.in_([PHONE_KEY, WHATSAPP_KEY]), Setting.is_deleted == False  # noqa: E712
                    )
                )
            ).all()
        update_from_items({"key": k, "value": v} for k, v in rows)
    except Exception:  # pragma: no cover - defensive
        logger.exception("Could not load contact numbers from settings; using config default")
