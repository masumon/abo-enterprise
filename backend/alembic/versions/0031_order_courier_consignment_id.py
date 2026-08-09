"""orders.courier_consignment_id — store the Steadfast consignment id.

Shipped as migrations/034_order_courier_consignment_id.sql for manual runs
too — this is the alembic equivalent so a fresh deploy adds the column.
Idempotent; no-op downgrade.

Revision ID: 0031
Revises: 0030
Create Date: 2026-08-09
"""

from typing import Sequence

from alembic import op

revision: str = "0031"
down_revision: str | None = "0030"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_consignment_id VARCHAR(50)"
    )


def downgrade() -> None:
    # Non-destructive: leave the column in place.
    pass
