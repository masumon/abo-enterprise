"""customer_phone indexes — additive, non-destructive.

Adds indexes on the customer_phone columns that back customer-facing
lookups (order history by verified phone, public invoice phone match).
Both statements use IF NOT EXISTS so the migration is safe to re-run.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-08
"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # orders.customer_phone — used by /orders/by-phone and public invoice lookup
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)")
    # bookings_v2.customer_phone — used by public booking invoice lookup
    op.execute("CREATE INDEX IF NOT EXISTS idx_bookings_v2_customer_phone ON bookings_v2(customer_phone)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_orders_customer_phone")
    op.execute("DROP INDEX IF EXISTS idx_bookings_v2_customer_phone")
