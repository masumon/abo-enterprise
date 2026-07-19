"""delivery_advance — per-product/service delivery + advance/consultancy.

Adds optional delivery-charge overrides and an advance (prepaid) on/off flag
to products and services, a consultancy fee to services, and advance tracking
(amount + paid) to orders and bookings_v2. Also seeds the delivery/advance
settings. All additive and idempotent (IF NOT EXISTS / ON CONFLICT); no-op
downgrade. Mirrors migrations/024_delivery_advance.sql for manual runs.

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-19
"""

from typing import Sequence

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_advance BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2)")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS consultancy_fee NUMERIC(10,2)")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_advance BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_paid BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS advance_paid BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute(
        """
        INSERT INTO settings (key, value, data_type, description, is_editable) VALUES
          ('advance_delivery_charge', '120', 'number', 'Advance/prepaid charge for requires_advance items', TRUE),
          ('delivery_charge_sylhet',  '60',  'number', 'Delivery charge inside Sylhet', TRUE),
          ('delivery_charge_dhaka',   '120', 'number', 'Delivery charge to Dhaka & metro', TRUE),
          ('delivery_charge_outside', '130', 'number', 'Delivery charge outside Dhaka/Sylhet', TRUE)
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
