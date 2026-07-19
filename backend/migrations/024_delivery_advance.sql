-- 024_delivery_advance.sql
-- Per-product / per-service delivery + advance (prepaid) / consultancy system.
-- Adds optional columns and seeds the delivery/advance settings. Fully
-- idempotent (IF NOT EXISTS / ON CONFLICT) — safe to run more than once, and
-- safe even if the build-time Alembic migration already applied it.
-- Run in Supabase (Render free tier does not apply Alembic to the DB).
BEGIN;

-- Products: optional delivery override + advance on/off toggle
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_advance BOOLEAN NOT NULL DEFAULT FALSE;

-- Services: delivery charge, advance consultancy fee + advance on/off toggle
ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS consultancy_fee NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_advance BOOLEAN NOT NULL DEFAULT FALSE;

-- Orders: advance tracking (kept pending until the advance is received)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS advance_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Bookings (v2): advance consultancy tracking
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS advance_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Delivery/advance settings (admin-editable). Zone defaults reflect a Sylhet
-- upazila origin; free delivery over the min amount stays enabled.
INSERT INTO settings (key, value, data_type, description, is_editable) VALUES
  ('advance_delivery_charge', '120', 'number', 'Advance/prepaid charge (৳) for products/services flagged requires_advance', TRUE),
  ('delivery_charge_sylhet',  '60',  'number', 'Delivery charge inside Sylhet (৳)', TRUE),
  ('delivery_charge_dhaka',   '120', 'number', 'Delivery charge to Dhaka & metro (৳)', TRUE),
  ('delivery_charge_outside', '130', 'number', 'Delivery charge outside Dhaka/Sylhet (৳)', TRUE)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- OPTIONAL — if your DB already has the OLD zone values (e.g. Sylhet = 0 / free)
-- and you want to switch to the new standard, uncomment and run this once:
-- UPDATE settings SET value = '60'  WHERE key = 'delivery_charge_sylhet';
-- UPDATE settings SET value = '120' WHERE key = 'delivery_charge_dhaka';
-- UPDATE settings SET value = '130' WHERE key = 'delivery_charge_outside';

-- VERIFY:
-- SELECT key, value FROM settings WHERE key LIKE 'delivery_charge%' OR key = 'advance_delivery_charge';
-- SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name IN ('delivery_charge','requires_advance');
