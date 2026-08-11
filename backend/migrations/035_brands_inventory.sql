-- 035_brands_inventory.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: non-destructive. Does not DROP/TRUNCATE/DELETE any table or row.
-- Existing product stock and existing business data are preserved.
-- Run once in Supabase SQL Editor. Every statement is idempotent where applicable.

BEGIN;

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
);

CREATE INDEX IF NOT EXISTS ix_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS ix_brands_active_deleted ON brands(is_active, is_deleted);

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
);

CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_created
    ON inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_type
    ON inventory_movements(movement_type);

-- Capture the current product stock as an opening balance exactly once per product.
-- This inserts into the NEW inventory history table only; products are never updated.
INSERT INTO inventory_movements (
    product_id, movement_type, quantity_delta, quantity_before, quantity_after,
    reference_type, reason
)
SELECT
    p.id, 'opening_balance', p.stock_quantity, 0, p.stock_quantity, 'migration',
    'Opening inventory balance captured when the dedicated inventory module was introduced'
FROM products AS p
WHERE p.is_deleted = FALSE
  AND NOT EXISTS (
      SELECT 1
      FROM inventory_movements AS m
      WHERE m.product_id = p.id
        AND m.movement_type = 'opening_balance'
        AND m.reference_type = 'migration'
  );

-- Create/update the stock-change function without touching existing product rows.
CREATE OR REPLACE FUNCTION record_product_stock_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity
       AND COALESCE(current_setting('abo.inventory_movement_suppressed', true), 'false') <> 'true' THEN
        INSERT INTO inventory_movements (
            product_id, movement_type, quantity_delta, quantity_before,
            quantity_after, reference_type, reason
        )
        VALUES (
            NEW.id, 'system', NEW.stock_quantity - OLD.stock_quantity,
            OLD.stock_quantity, NEW.stock_quantity, 'product_write',
            'Stock changed through an existing product/order workflow'
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Intentionally do NOT DROP an existing trigger.
-- Create the trigger only when it does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE t.tgname = 'trg_products_stock_inventory'
          AND c.relname = 'products'
          AND n.nspname = current_schema()
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_products_stock_inventory
        AFTER UPDATE OF stock_quantity ON products
        FOR EACH ROW
        EXECUTE FUNCTION record_product_stock_change();
    END IF;
END;
$$;

COMMIT;
