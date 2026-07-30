"""order_company_identity — institutional invoice fields on orders (additive).

Adds five nullable columns to ``orders``: company_name, company_bin,
company_tin, po_number and billing_address. All NULL on a personal order, which
is every existing row, so nothing about totals, tax, payment status or invoice
generation changes.

This mirrors ``manual_sql/0009_order_company_identity.sql``, which the
repository owner has already executed against production. The statements are
idempotent (IF NOT EXISTS), so upgrading a database that already has the
columns is a no-op, and a fresh database gets them from Alembic alone.

Additive; no-op downgrade → zero data loss.

Revision ID: 0019
Revises: 0018
Create Date: 2026-07-30
"""

from typing import Sequence

from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_COLUMNS = (
    ("company_name", "VARCHAR(255)", "Institution the invoice is issued to. NULL = personal order."),
    ("company_bin", "VARCHAR(50)", "Business Identification Number, printed on the invoice when present."),
    ("company_tin", "VARCHAR(50)", "Tax Identification Number, optional."),
    ("po_number", "VARCHAR(100)", "Buyer purchase-order reference; government bills are not settled without it."),
    ("billing_address", "TEXT", "Billing address when it differs from delivery_address."),
)


def upgrade() -> None:
    for name, sql_type, comment in _COLUMNS:
        op.execute(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {name} {sql_type}")
        op.execute(f"COMMENT ON COLUMN orders.{name} IS '{comment}'")


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
