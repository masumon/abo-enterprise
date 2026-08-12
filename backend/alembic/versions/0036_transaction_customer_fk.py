"""transaction_customer_fk — nullable customer_id FK on orders, bookings_v2
and leads_v2, resolved going forward by app.core.customer_master at create
time. Closes the gap where the customer_master table (0034) had no
structural link back to the tables it summarizes and only grew via a
one-time manual SQL backfill.

This migration is intentionally schema-only and additive — existing rows
keep customer_id = NULL; there is no bulk backfill here (that would need to
run the same phone-matching logic as get_or_create_customer against
production data, reviewed separately, same as the 0034 customer backfill).

Revision ID: 0036
Revises: 0035
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0036"
down_revision: str | None = "0035"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_orders_customer_id ON orders(customer_id)")

    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_bookings_v2_customer_id ON bookings_v2(customer_id)")

    op.execute("ALTER TABLE leads_v2 ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_leads_v2_customer_id ON leads_v2(customer_id)")


def downgrade() -> None:
    op.execute("ALTER TABLE leads_v2 DROP COLUMN IF EXISTS customer_id")
    op.execute("ALTER TABLE bookings_v2 DROP COLUMN IF EXISTS customer_id")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS customer_id")
