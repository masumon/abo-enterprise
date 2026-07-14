"""commerce_capabilities — per-item Orderable/Bookable overrides (additive).

Adds nullable ``is_orderable`` / ``is_bookable`` boolean columns to ``products``
and ``services``. NULL (the default for every existing row) means "infer from
type" — exactly today's behaviour — so nothing changes until an admin opts an
item in. The capability layer (app/core/capabilities.py) already honours these
columns.

Idempotent (IF NOT EXISTS) and additive; no-op downgrade → zero data loss.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-14
"""

from typing import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN")


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
