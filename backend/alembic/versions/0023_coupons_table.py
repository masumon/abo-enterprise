"""coupons_table — real coupons table replacing the coupons_json Setting.

Mirrors ``manual_sql/0023_coupons_table.sql``. Seeds the two coupons the
live site is actually running on today (ABO10, WELCOME), so behaviour is
unchanged the moment this table exists.

Revision ID: 0023
Revises: 0022
Create Date: 2026-08-04
"""

from typing import Sequence

from alembic import op

revision: str = "0023"
down_revision: str | None = "0022"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS coupons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_percent NUMERIC(5,2) NOT NULL,
            min_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)")
    op.execute("""
        INSERT INTO coupons (code, discount_percent, min_subtotal, is_active)
        VALUES ('ABO10', 10, 0, TRUE), ('WELCOME', 5, 500, TRUE)
        ON CONFLICT (code) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS coupons")
