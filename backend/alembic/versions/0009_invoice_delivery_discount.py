"""invoice_delivery_discount — persist delivery charge & discount on invoices.

Adds ``delivery_charge`` and ``discount_amount`` to ``invoices`` so an invoice
always reconciles (subtotal − discount + delivery = total) and can render a
delivery-charge line even when it is free (0). Both default 0; existing rows
keep 0 and are backfilled from subtotal/total on read.

Additive and idempotent (IF NOT EXISTS); no-op downgrade.

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-18
"""

from typing import Sequence

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0")
    # Backfill existing order invoices: any gap between total and subtotal that
    # isn't tax is the delivery charge (discount stays 0 — unknown historically).
    op.execute(
        """
        UPDATE invoices
        SET delivery_charge = GREATEST(total - subtotal - COALESCE(tax, 0), 0)
        WHERE order_id IS NOT NULL
          AND delivery_charge = 0
          AND total > subtotal + COALESCE(tax, 0)
        """
    )


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
