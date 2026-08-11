-- 0033_brand_product_relation.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: additive and non-destructive. No DROP/TRUNCATE/DELETE.
-- Adds a nullable master-brand FK while preserving the existing products.brand cache.
-- Existing product rows are only populated in the NEW brand_id column when a safe
-- exact case-insensitive match to an active brand master record exists.

BEGIN;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS brand_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_products_brand_id'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT fk_products_brand_id
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS ix_products_brand_id ON products(brand_id);

-- Backfill only the new nullable relation column. The existing brand text is untouched.
UPDATE products AS p
SET brand_id = b.id
FROM brands AS b
WHERE p.brand_id IS NULL
  AND p.brand IS NOT NULL
  AND b.is_deleted = FALSE
  AND (
      lower(trim(p.brand)) = lower(b.slug)
      OR lower(trim(p.brand)) = lower(b.name_en)
      OR (
          b.name_bn IS NOT NULL
          AND lower(trim(p.brand)) = lower(b.name_bn)
      )
  );

-- Keep the legacy text field and the master relation aligned for existing product
-- create/update workflows. Unknown legacy brand text remains preserved with NULL FK.
CREATE OR REPLACE FUNCTION sync_product_brand_master()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.brand IS NULL OR btrim(NEW.brand) = '' THEN
        NEW.brand_id := NULL;
    ELSE
        SELECT b.id
        INTO NEW.brand_id
        FROM brands AS b
        WHERE b.is_deleted = FALSE
          AND (
              lower(trim(NEW.brand)) = lower(b.slug)
              OR lower(trim(NEW.brand)) = lower(b.name_en)
              OR (
                  b.name_bn IS NOT NULL
                  AND lower(trim(NEW.brand)) = lower(b.name_bn)
              )
          )
        ORDER BY b.is_active DESC, b.sort_order ASC, b.created_at ASC
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE t.tgname = 'trg_products_brand_master'
          AND c.relname = 'products'
          AND n.nspname = current_schema()
          AND NOT t.tgisinternal
    ) THEN
        CREATE TRIGGER trg_products_brand_master
        BEFORE INSERT OR UPDATE OF brand ON products
        FOR EACH ROW
        EXECUTE FUNCTION sync_product_brand_master();
    END IF;
END;
$$;

COMMIT;
