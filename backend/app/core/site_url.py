"""Resolve the public site base URL for links in emails (View in Admin, Track).

Priority: the admin-editable ``site_url`` setting → ``FRONTEND_URL`` env → the
built-in default. This lets the owner fix a wrong deploy URL from Admin →
Settings without a redeploy (the old links were hard-tied to FRONTEND_URL, which
had been set to the wrong Vercel domain).
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Setting


async def resolve_site_url(db: AsyncSession) -> str:
    """Public site base URL, trailing slash stripped."""
    try:
        row = (
            await db.execute(
                select(Setting).where(
                    Setting.key == "site_url", Setting.is_deleted == False  # noqa: E712
                )
            )
        ).scalar_one_or_none()
        if row and (row.value or "").strip():
            return row.value.strip().rstrip("/")
    except Exception:  # noqa: BLE001 — never let a settings read break email links
        pass
    return settings.FRONTEND_URL.rstrip("/")
