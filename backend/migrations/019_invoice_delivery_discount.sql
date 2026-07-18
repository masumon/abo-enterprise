-- 019_invoice_delivery_discount.sql
-- Persist delivery charge & coupon discount on invoices so the invoice always
-- reconciles (subtotal - discount + delivery = total) and can render a
-- delivery-charge line even when free (0).
-- Manual mirror of alembic 0009. Additive + idempotent; run in Supabase SQL Editor.
-- NOTE: `alembic upgrade head` runs this automatically at deploy — manual run optional.
BEGIN;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill existing order invoices: the gap between total and subtotal (minus
-- tax) is the historical delivery charge.
UPDATE invoices
SET delivery_charge = GREATEST(total - subtotal - COALESCE(tax, 0), 0)
WHERE order_id IS NOT NULL
  AND delivery_charge = 0
  AND total > subtotal + COALESCE(tax, 0);

COMMIT;
