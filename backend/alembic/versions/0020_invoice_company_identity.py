"""invoice_company_identity — the invoice keeps its own copy (additive).

Adds five nullable columns to ``invoices``: company_name, company_bin,
company_tin, po_number and billing_address. 0009 put the same identity on
``orders`` and the PDF reads it from there; these columns let an issued invoice
hold its own copy, so editing or deleting the order can never change an invoice
that has already gone out.

NULL on every existing invoice, which keeps rendering from the order exactly as
it does today.

This mirrors ``manual_sql/0010_invoice_company_identity.sql``. The statements
are idempotent (IF NOT EXISTS), so upgrading a database where the owner has
already run that file is a no-op, and a fresh database gets the columns from
Alembic alone.

Additive; no-op downgrade → zero data loss.

Revision ID: 0020
Revises: 0019
Create Date: 2026-07-30
"""

from typing import Sequence

from alembic import op

revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_COLUMNS = (
    ("company_name", "VARCHAR(255)", "Institution this invoice was issued to, copied from the order at issue time. NULL = personal order, or issued before 0010."),
    ("company_bin", "VARCHAR(50)", "Business Identification Number as printed on this invoice."),
    ("company_tin", "VARCHAR(50)", "Tax Identification Number as printed on this invoice."),
    ("po_number", "VARCHAR(100)", "Buyer purchase-order reference as printed on this invoice."),
    ("billing_address", "TEXT", "Billing address as printed on this invoice."),
)


def upgrade() -> None:
    for name, sql_type, comment in _COLUMNS:
        op.execute(f"ALTER TABLE invoices ADD COLUMN IF NOT EXISTS {name} {sql_type}")
        op.execute(f"COMMENT ON COLUMN invoices.{name} IS '{comment}'")


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
