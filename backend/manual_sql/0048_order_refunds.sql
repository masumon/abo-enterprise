-- 0048: order refunds / returns (Admin → Orders → "রিফান্ড / ফেরত"). 2026-10-16.
-- Additive (4 nullable columns). Safe to run more than once.
-- Run in Supabase BEFORE merging (Render auto-deploys). The API also adds these columns
-- itself at start-up if they are missing (core/schema_guard.py), so order pages never break.
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
COMMIT;
-- Check: SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name LIKE 'refund%';
