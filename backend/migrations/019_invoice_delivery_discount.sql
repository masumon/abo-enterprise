-- ============================================================================
-- 019_invoice_delivery_discount.sql  (SINGLE manual file — run in Supabase)
--
-- Render-এর free tier-এ deploy-এর সময় `alembic upgrade head` চলে না, তাই এই
-- মাইগ্রেশনটি ম্যানুয়ালি চালাতে হয়। এই একটি ফাইলই যথেষ্ট:
--   1) invoices টেবিলে delivery_charge ও discount_amount কলাম যোগ করে
--   2) পুরনো অর্ডার-ইনভয়েসে delivery_charge ব্যাকফিল করে (total - subtotal - tax)
--   3) alembic_version কে 0008 → 0009 করে (alembic-এর সাথে মিল রাখতে)
--
-- Mirror of alembic 0009_invoice_delivery_discount.
-- SAFE / নিরাপদ: পুরোটা additive + idempotent (IF NOT EXISTS / guarded)।
-- বারবার চালালেও সমস্যা নেই। পুরো ব্লকটা একবারে Supabase SQL Editor-এ Run করুন।
-- ============================================================================

BEGIN;

-- 1. নতুন কলাম (additive; ডিফল্ট 0)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 2. পুরনো অর্ডার-ইনভয়েসে delivery_charge ব্যাকফিল
--    (total ও subtotal-এর ব্যবধান, tax বাদে = ঐতিহাসিক ডেলিভারি চার্জ)
UPDATE invoices
SET delivery_charge = GREATEST(total - subtotal - COALESCE(tax, 0), 0)
WHERE order_id IS NOT NULL
  AND delivery_charge = 0
  AND total > subtotal + COALESCE(tax, 0);

-- 3. alembic_version 0008 → 0009 (alembic টেবিল থাকলে; guarded)
UPDATE alembic_version SET version_num = '0009' WHERE version_num = '0008';

COMMIT;

-- ── যাচাই / VERIFY (ঐচ্ছিক — রান করে দেখতে পারেন) ─────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'invoices' AND column_name IN ('delivery_charge','discount_amount');
-- SELECT version_num FROM alembic_version;
-- SELECT invoice_number, subtotal, discount_amount, delivery_charge, total
--   FROM invoices ORDER BY created_at DESC LIMIT 5;
