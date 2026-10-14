-- 0045: optional video link on products and services + product variant groups (admin forms, 2026-10-14).
-- Safe to run more than once. Run in Supabase SQL editor BEFORE the Render deploy.
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS video_url TEXT;
-- Product variants (colour/size): products sharing variant_group are shown as choices of each other.
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_group VARCHAR(64);
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_label VARCHAR(80);
CREATE INDEX IF NOT EXISTS ix_products_variant_group ON products (variant_group);
SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('video_url','variant_group','variant_label') AND table_name IN ('products','services');
