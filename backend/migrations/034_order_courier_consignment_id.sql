-- 034_order_courier_consignment_id.sql
-- Adds the Steadfast consignment id column used by the courier integration.
-- Safe to run multiple times (IF NOT EXISTS). Run in the Supabase SQL Editor
-- on the free tier where alembic is not executed.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_consignment_id VARCHAR(50);
