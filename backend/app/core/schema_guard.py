"""Start-up safety net for additive admin-security columns.

This project applies database changes by hand (backend/manual_sql/*.sql on Supabase,
because Render's free tier has no migration step). If the SQL is forgotten the new
admin-security columns are missing and *every* admin sign-in fails.

At start-up we look at `admin_users` once; only if a column is missing do we add it with
`ADD COLUMN IF NOT EXISTS` — the exact statements of manual_sql/0041_admin_security.sql.
Nothing is ever changed, dropped or rewritten, normal start-ups run no DDL at all, and a
failure here is logged but never blocks the API from starting.
"""
from __future__ import annotations

import logging

from sqlalchemy import text

logger = logging.getLogger(__name__)

# column -> DDL type (identical to alembic 0041 and manual_sql/0041)
ADMIN_SECURITY_COLUMNS: dict[str, str] = {
    "totp_recovery_codes": "TEXT",
    "totp_last_step": "BIGINT",
    "token_version": "INTEGER NOT NULL DEFAULT 0",
    "failed_login_count": "INTEGER NOT NULL DEFAULT 0",
    "locked_until": "TIMESTAMPTZ",
}


def missing_admin_security_statements(existing_columns: set[str]) -> list[str]:
    """ALTER statements for the columns that are not there yet (empty when all exist)."""
    return [
        f"ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS {name} {ddl}"
        for name, ddl in ADMIN_SECURITY_COLUMNS.items()
        if name not in existing_columns
    ]


async def ensure_admin_security_columns(engine) -> list[str]:
    """Add any missing admin-security columns. Returns the statements that were run."""
    if getattr(engine.dialect, "name", "") != "postgresql":
        return []
    try:
        async with engine.begin() as conn:
            rows = await conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'admin_users' AND table_schema = current_schema()"
                )
            )
            existing = {r[0] for r in rows}
            if not existing:  # table not there at all: nothing to patch
                return []
            statements = missing_admin_security_statements(existing)
            for stmt in statements:
                await conn.execute(text(stmt))
        if statements:
            logger.warning(
                "admin_users was missing %d admin-security column(s); added them automatically. "
                "Run backend/manual_sql/0041_admin_security.sql on Supabase to keep the schema record complete.",
                len(statements),
            )
        return statements
    except Exception:  # never stop the API from starting
        logger.exception("Schema guard could not check/patch admin_users columns")
        return []
