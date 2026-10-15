"""order refund/return columns. Mirrors backend/manual_sql/0048_order_refunds.sql.

Revision ID: 0045
Revises: 0044
"""
from alembic import op

revision: str = "0045"
down_revision: str | None = "0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name, ddl in (("refund_amount", "NUMERIC(10,2)"), ("refund_method", "VARCHAR(30)"),
                      ("refund_note", "TEXT"), ("refunded_at", "TIMESTAMPTZ")):
        op.execute(f"ALTER TABLE orders ADD COLUMN IF NOT EXISTS {name} {ddl}")


def downgrade() -> None:
    for name in ("refund_amount", "refund_method", "refund_note", "refunded_at"):
        op.execute(f"ALTER TABLE orders DROP COLUMN IF EXISTS {name}")
