"""courier automation columns. Mirrors backend/manual_sql/0050_courier_automation.sql.

Revision ID: 0046
Revises: 0045
"""
from alembic import op

revision: str = "0046"
down_revision: str | None = "0045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_dispatch_at TIMESTAMPTZ")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_error TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS courier_dispatch_at")
    op.execute("ALTER TABLE orders DROP COLUMN IF EXISTS courier_error")
