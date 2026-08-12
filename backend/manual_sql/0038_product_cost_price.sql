-- 0038_product_cost_price.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: additive only. Adds one nullable column, no data mutation.

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);

COMMIT;
