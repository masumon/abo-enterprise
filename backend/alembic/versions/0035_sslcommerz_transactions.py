"""sslcommerz_transactions — tracks SSLCommerz payment sessions so the IPN
callback can verify and resolve them to an order or booking, mirroring the
existing bkash_transactions / nagad_transactions tables.

Revision ID: 0035
Revises: 0034
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0035"
down_revision: str | None = "0034"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sslcommerz_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID REFERENCES orders(id),
            booking_id UUID REFERENCES bookings_v2(id),
            tran_id VARCHAR(50) NOT NULL UNIQUE,
            val_id VARCHAR(100),
            bank_tran_id VARCHAR(100),
            card_type VARCHAR(50),
            amount NUMERIC(10, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
            status VARCHAR(20) NOT NULL,
            status_message TEXT,
            webhook_received BOOLEAN NOT NULL DEFAULT FALSE,
            webhook_timestamp TIMESTAMPTZ,
            raw_response JSON NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_sslcommerz_transactions_tran_id ON sslcommerz_transactions(tran_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_sslcommerz_transactions_status ON sslcommerz_transactions(status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sslcommerz_transactions")
