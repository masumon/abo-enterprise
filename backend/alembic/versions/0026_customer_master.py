"""customer_master — canonical customer identity/profile table.

This migration is intentionally schema-only. Existing orders, bookings and
leads remain untouched; production data backfill/reconciliation must be
reviewed and executed separately.

Revision ID: 0026
Revises: 0025
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0026"
down_revision: str | None = "0025"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            company VARCHAR(255),
            address TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_customers_phone ON customers(phone)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_customers_is_deleted ON customers(is_deleted)")


def downgrade() -> None:
    # This is intentionally non-destructive by default: downgrading this
    # migration must not silently destroy customer-master records.
    raise RuntimeError(
        "Customer master downgrade is intentionally blocked to prevent data loss. "
        "Archive/export and explicit approval are required before dropping customers."
    )
