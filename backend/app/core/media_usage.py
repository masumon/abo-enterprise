"""Where is a media file used?  Scans the site's content tables for an asset's
Cloudinary public_id (stable across resized/transformed URLs) or its URL.

Read-only. Logs, sessions, analytics and other non-content tables are skipped.
PostgreSQL only (row_to_json); other databases report "no usage known".
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Non-content tables: logs, auth, analytics, the media table itself.
_SKIP = (
    "media_assets", "alembic", "activity_log", "audit", "admin_session", "session", "login", "otp", "token",
    "password", "page_view", "analytics", "event", "app_download", "notification", "email_log", "rate_limit",
    "chat", "assistant", "import_run", "backup", "visitor", "search_log",
)
_ROW_LIMIT = 20000
_CACHE_TTL = 60.0
_cache: dict[str, Any] = {"at": 0.0, "rows": None}

_LABEL_BN = {
    "products": "পণ্য", "services": "সেবা", "categories": "ক্যাটাগরি", "blog_posts": "ব্লগ", "pages": "পেজ",
    "promo_slides": "প্রোমো স্লাইড", "site_settings": "সেটিংস", "settings": "সেটিংস", "reviews": "রিভিউ",
    "testimonials": "রিভিউ", "team_members": "টিম", "orders": "অর্ডার", "order_items": "অর্ডার",
    "bookings": "বুকিং", "showcase_items": "শোকেস", "announcements": "ঘোষণা", "brands": "ব্র্যান্ড",
    "client_logos": "ক্লায়েন্ট লোগো", "gallery": "গ্যালারি", "app_releases": "আপন অ্যাপ",
}
_ADMIN_LINK = {
    "products": "/sumon/products?edit={id}", "services": "/sumon/services?edit={id}",
    "blog_posts": "/sumon/blog?edit={id}", "categories": "/sumon/categories?edit={id}",
    "promo_slides": "/sumon/promo-slides", "site_settings": "/sumon/settings", "settings": "/sumon/settings",
}
_NAME_KEYS = ("name_bn", "title_bn", "name_en", "title_en", "name", "title", "key", "tier_name", "order_number", "slug")


def needles_for(url: str, public_id: str | None) -> list[str]:
    """Strings that identify the file inside stored content."""
    out = []
    if public_id:
        out.append(public_id)
    if url:
        out.append(url.split("?")[0])
    return out


async def _rows(db: AsyncSession) -> list[tuple[str, str]]:
    """(table, row-as-json-text) for every content row — cached briefly."""
    if _cache["rows"] is not None and time.monotonic() - _cache["at"] < _CACHE_TTL:
        return _cache["rows"]
    if getattr(db.bind.dialect, "name", "") != "postgresql":
        return []
    tables = (await db.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'"
    ))).scalars().all()
    rows: list[tuple[str, str]] = []
    for t in tables:
        if any(k in t for k in _SKIP) or not t.replace("_", "").isalnum():
            continue
        try:
            res = await db.execute(text(f'SELECT row_to_json(x)::text FROM "{t}" x LIMIT {_ROW_LIMIT}'))
            rows.extend((t, r) for r in res.scalars().all() if r)
        except Exception as exc:  # noqa: BLE001 — one odd table must not break the scan
            logger.info("media usage: skipped %s (%s)", t, exc)
            await db.rollback()
    _cache.update(at=time.monotonic(), rows=rows)
    return rows


def invalidate() -> None:
    _cache.update(at=0.0, rows=None)


def _describe(table: str, raw: str) -> dict:
    try:
        row = json.loads(raw)
    except ValueError:
        row = {}
    if row.get("is_deleted") is True:
        return {}
    rid = str(row.get("id") or "")
    name = next((str(row[k]) for k in _NAME_KEYS if row.get(k)), "")
    link = _ADMIN_LINK.get(table, "").format(id=rid) or None
    return {"table": table, "kind": _LABEL_BN.get(table, table.replace("_", " ")), "id": rid, "name": name[:120], "admin_url": link}


async def usage_for(db: AsyncSession, assets: list[tuple[str, str, str | None]]) -> dict[str, list[dict]]:
    """{asset_id: [where it is used]} for (asset_id, url, public_id) tuples."""
    rows = await _rows(db)
    out: dict[str, list[dict]] = {}
    for aid, url, pid in assets:
        hits: list[dict] = []
        seen: set[tuple[str, str]] = set()
        needles = needles_for(url, pid)
        for table, raw in rows:
            if any(n and n in raw for n in needles):
                d = _describe(table, raw)
                if d and (d["table"], d["id"]) not in seen:
                    seen.add((d["table"], d["id"]))
                    hits.append(d)
            if len(hits) >= 20:
                break
        out[aid] = hits
    return out
