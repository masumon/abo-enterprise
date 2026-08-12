"""product_cost_price — optional admin-entered per-unit cost basis on
products, the only real (non-fabricated) input a Profit report can use.
NULL for every existing product until an admin fills it in.

Revision ID: 0038
Revises: 0037
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0038"
down_revision: str | None = "0037"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2)")


def downgrade() -> None:
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS cost_price")
