"""Lightweight startup maintenance — keeps the free-tier database lean.

Runs once per app start (Render free instances restart frequently, so this
executes regularly without needing a scheduler). Every task here must be
safe to run at any time, quick, and non-destructive to business data.
"""

from __future__ import annotations

import logging

from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Admin activity logs are an audit trail, not business data; on Supabase's
# free 500MB tier they are the fastest-growing table. 90 days retention
# keeps recent history reviewable while capping growth.
ACTIVITY_LOG_RETENTION_DAYS = 90


async def prune_old_activity_logs() -> None:
    """Delete activity_logs entries older than the retention window."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text(
                    "DELETE FROM activity_logs "
                    "WHERE created_at < NOW() - make_interval(days => :days)"
                ),
                {"days": ACTIVITY_LOG_RETENTION_DAYS},
            )
            await db.commit()
            deleted = result.rowcount or 0
            if deleted:
                logger.info(
                    "Maintenance: pruned %d activity_logs rows older than %d days",
                    deleted,
                    ACTIVITY_LOG_RETENTION_DAYS,
                )
    except Exception as exc:
        # Maintenance must never block startup.
        logger.warning("Maintenance: activity log prune skipped: %s", exc)
