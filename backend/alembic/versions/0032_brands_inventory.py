"""Brands master + dedicated inventory foundation.

Revision ID: 0032
Revises: 0031
Create Date: 2026-08-11
"""

from typing import Sequence
from alembic import op

revision: str = "0032"
down_revision: str | None = "0031"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS brands (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(120) NOT NULL UNIQUE,
            name_en VARCHAR(255) NOT NULL,
            name_bn VARCHAR(255),
            description_en TEXT,
            description_bn TEXT,
            logo_url TEXT,
            website_url VARCHAR(500),
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_brands_slug ON brands(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_brands_active_deleted ON brands(is_active, is_deleted)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
            movement_type VARCHAR(30) NOT NULL,
            quantity_delta INTEGER NOT NULL,
            quantity_before INTEGER NOT NULL,
            quantity_after INTEGER NOT NULL,
            reference_type VARCHAR(50),
            reference_id UUID,
            reason TEXT,
            note TEXT,
            admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_created ON inventory_movements(product_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_movements_type ON inventory_movements(movement_type)")
    op.execute("""
        CREATE OR REPLACE FUNCTION record_product_stock_change()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity
               AND COALESCE(current_setting('abo.inventory_movement_suppressed', true), 'false') <> 'true' THEN
                INSERT INTO inventory_movements (product_id, movement_type, quantity_delta, quantity_before, quantity_after, reference_type, reason)
                VALUES (NEW.id, 'system', NEW.stock_quantity - OLD.stock_quantity, OLD.stock_quantity, NEW.stock_quantity,
                        'product_write', 'Stock changed through an existing product/order workflow');
            END IF;
            RETURN NEW;
        END;
        $$;
    """)
    op.execute("DROP TRIGGER IF EXISTS trg_products_stock_inventory ON products")
    op.execute("""
        CREATE TRIGGER trg_products_stock_inventory
        AFTER UPDATE OF stock_quantity ON products
        FOR EACH ROW EXECUTE FUNCTION record_product_stock_change()
    """)


def downgrade() -> None:
    # Non-destructive: inventory history and brand master data must not be dropped.
    pass
