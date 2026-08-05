"""archive_dead_tables — non-destructive rename of 5 tables confirmed to
have zero application code referencing them (revenue_transactions,
customer_interactions, lead_form_fields, asset_usage, admin_settings — the
latter's own /api/v1/admin/settings* routes were removed from
admin_settings.py in this same change, leaving only its live PaymentMethod
endpoints). Renamed to _archived_<name> rather than dropped, so all data is
preserved and trivially recoverable. `subcategories` is deliberately left
alone — see the comment in manual_sql/0025_archive_dead_tables.sql.

Mirrors ``manual_sql/0025_archive_dead_tables.sql``.

Revision ID: 0025
Revises: 0024
Create Date: 2026-08-05
"""

from typing import Sequence

from alembic import op

revision: str = "0025"
down_revision: str | None = "0024"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_TABLES = [
    "revenue_transactions",
    "customer_interactions",
    "lead_form_fields",
    "asset_usage",
    "admin_settings",
]


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE IF EXISTS {table} RENAME TO _archived_{table}")
        op.execute(
            f"COMMENT ON TABLE _archived_{table} IS "
            "'Archived 2026-08-05 — unused, no app code references this table. "
            "Safe to DROP after a confirmation period.'"
        )


def downgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE IF EXISTS _archived_{table} RENAME TO {table}")
