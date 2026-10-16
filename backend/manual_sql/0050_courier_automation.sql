-- 0050: courier automation (Admin → কুরিয়ার; auto send after a 15 s undo). 2026-10-16.
-- Additive (2 nullable columns). Safe to run more than once. Run in Supabase BEFORE merging.
-- The API also adds them at start-up if missing (core/schema_guard.py).
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_dispatch_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_error TEXT;
COMMIT;
