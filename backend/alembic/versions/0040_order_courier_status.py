"""order_courier_status — real delivery-status field populated by the
Steadfast webhook (POST /orders/steadfast/webhook), so "delivered" reflects
what the courier actually reported instead of an admin-guessed heuristic.
NULL for every order until the courier's first status callback arrives.

Revision ID: 0040
Revises: 0039
Create Date: 2026-08-13
"""

from typing import Sequence

from alembic import op

revision: str = "0040"
down_revision: str | None = "0039"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50)")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status_updated_at TIMESTAMPTZ")


def downgrade() -> None:
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS courier_status_updated_at")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS courier_status")
