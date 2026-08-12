-- 0040_order_courier_status.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: additive only. Adds two nullable columns, no data mutation.
-- Populated going forward by the Steadfast delivery-status webhook
-- (POST /orders/steadfast/webhook) — NULL for every existing order until
-- the courier's first status callback arrives for it.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status_updated_at TIMESTAMPTZ;

COMMIT;
