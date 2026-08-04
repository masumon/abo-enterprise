-- 0022_data_integrity_hardening.sql
-- Audit remediation: DB-level CHECK constraints, missing indexes, and
-- missing updated_at/is_deleted columns flagged by the production audit.
--
-- WHY
-- Money/quantity fields (price, stock, rating, totals) were validated only
-- by Pydantic at the API layer — the database itself trusted any writer
-- (a script, a future service, manual SQL). A bypass of the API could insert
-- negative prices or an out-of-range rating with nothing to stop it.
--
-- Invoice/reconciliation lookups join on order_id/booking_id/lead_id columns
-- that had no index — fine at today's row counts, a real cost as orders grow.
--
-- Several tables were missing updated_at (no way to tell when a row last
-- changed) or is_deleted (inconsistent with the soft-delete pattern used
-- everywhere else, meaning these tables can only ever be hard-deleted).
--
-- SAFETY
-- Every ALTER is additive (new column) or a CHECK constraint added via a
-- DO-block that first checks pg_constraint, so re-running this file is a
-- no-op — safe to paste and run more than once by accident.
-- CHECK constraints only reject *future* writes; they do not touch existing
-- rows. If any existing row already violates a constraint, that one
-- statement will fail loudly and stop — nothing else in the file is skipped
-- silently. Run the SELECT queries in STEP 0 first; if any return rows, fix
-- or investigate that data before running STEP 2.
--
-- AFTER RUNNING
-- Tell me it is applied and whether STEP 0 found any violating rows. Only
-- then should the SQLAlchemy models be updated to map the new
-- updated_at/is_deleted columns — mapping them before they exist in the
-- database would break every read on that table in production.
--
-- ROLLBACK
--   See the DROP statements at the bottom of each step (commented out).
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually in the Supabase
-- SQL editor (this project's Render free tier does not run Alembic on
-- deploy, so this file — not alembic/versions/0022_*.py — is the real
-- source of truth for this change; the Alembic file mirrors it for anyone
-- who later runs `alembic upgrade head` against a fresh database).


-- =============================================================
-- STEP 0 — pre-flight: find any existing rows that WOULD violate
-- the constraints below. Run this first. If everything returns 0 rows,
-- STEP 2 is guaranteed to succeed.
-- =============================================================
SELECT 'products.price' AS check_name, count(*) FROM products WHERE price < 0
UNION ALL SELECT 'products.stock_quantity', count(*) FROM products WHERE stock_quantity < 0
UNION ALL SELECT 'products.rating', count(*) FROM products WHERE rating IS NOT NULL AND (rating < 0 OR rating > 5)
UNION ALL SELECT 'reviews.rating', count(*) FROM reviews WHERE rating < 1 OR rating > 5
UNION ALL SELECT 'orders.subtotal', count(*) FROM orders WHERE subtotal < 0
UNION ALL SELECT 'orders.total', count(*) FROM orders WHERE total < 0
UNION ALL SELECT 'orders.discount_amount', count(*) FROM orders WHERE discount_amount < 0
UNION ALL SELECT 'order_items.quantity', count(*) FROM order_items WHERE quantity <= 0
UNION ALL SELECT 'order_items.subtotal', count(*) FROM order_items WHERE subtotal < 0
UNION ALL SELECT 'services.base_price', count(*) FROM services WHERE base_price IS NOT NULL AND base_price < 0
UNION ALL SELECT 'services.min_price', count(*) FROM services WHERE min_price IS NOT NULL AND min_price < 0
UNION ALL SELECT 'services.max_price', count(*) FROM services WHERE max_price IS NOT NULL AND max_price < 0
UNION ALL SELECT 'services.hourly_rate', count(*) FROM services WHERE hourly_rate IS NOT NULL AND hourly_rate < 0
UNION ALL SELECT 'bookings_v2.quoted_price', count(*) FROM bookings_v2 WHERE quoted_price IS NOT NULL AND quoted_price < 0
UNION ALL SELECT 'bookings_v2.final_price', count(*) FROM bookings_v2 WHERE final_price IS NOT NULL AND final_price < 0;


-- =============================================================
-- STEP 1 — missing indexes on FK/join columns (safe, no data risk)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_order_id ON revenue_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_booking_id ON revenue_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_lead_id ON revenue_transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_bkash_transactions_order_id ON bkash_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_bkash_transactions_booking_id ON bkash_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_nagad_transactions_order_id ON nagad_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_nagad_transactions_booking_id ON nagad_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Rollback:
-- DROP INDEX IF EXISTS idx_invoices_order_id, idx_invoices_booking_id,
--   idx_revenue_transactions_order_id, idx_revenue_transactions_booking_id,
--   idx_revenue_transactions_lead_id, idx_bkash_transactions_order_id,
--   idx_bkash_transactions_booking_id, idx_nagad_transactions_order_id,
--   idx_nagad_transactions_booking_id, idx_order_items_product_id;


-- =============================================================
-- STEP 2 — CHECK constraints (only run after STEP 0 returns all zeros)
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonneg') THEN
    ALTER TABLE products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonneg') THEN
    ALTER TABLE products ADD CONSTRAINT products_stock_nonneg CHECK (stock_quantity >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_range') THEN
    ALTER TABLE products ADD CONSTRAINT products_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_nonneg') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_nonneg') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_discount_nonneg CHECK (discount_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_subtotal_nonneg') THEN
    ALTER TABLE order_items ADD CONSTRAINT order_items_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_base_price_nonneg') THEN
    ALTER TABLE services ADD CONSTRAINT services_base_price_nonneg CHECK (base_price IS NULL OR base_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_min_price_nonneg') THEN
    ALTER TABLE services ADD CONSTRAINT services_min_price_nonneg CHECK (min_price IS NULL OR min_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_max_price_nonneg') THEN
    ALTER TABLE services ADD CONSTRAINT services_max_price_nonneg CHECK (max_price IS NULL OR max_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_hourly_rate_nonneg') THEN
    ALTER TABLE services ADD CONSTRAINT services_hourly_rate_nonneg CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_v2_quoted_price_nonneg') THEN
    ALTER TABLE bookings_v2 ADD CONSTRAINT bookings_v2_quoted_price_nonneg CHECK (quoted_price IS NULL OR quoted_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_v2_final_price_nonneg') THEN
    ALTER TABLE bookings_v2 ADD CONSTRAINT bookings_v2_final_price_nonneg CHECK (final_price IS NULL OR final_price >= 0);
  END IF;
END $$;

-- Rollback (run individually as needed):
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_nonneg;
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_nonneg;
-- ALTER TABLE products DROP CONSTRAINT IF EXISTS products_rating_range;
-- ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_range;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_subtotal_nonneg;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_total_nonneg;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_discount_nonneg;
-- ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_quantity_positive;
-- ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_subtotal_nonneg;
-- ALTER TABLE services DROP CONSTRAINT IF EXISTS services_base_price_nonneg;
-- ALTER TABLE services DROP CONSTRAINT IF EXISTS services_min_price_nonneg;
-- ALTER TABLE services DROP CONSTRAINT IF EXISTS services_max_price_nonneg;
-- ALTER TABLE services DROP CONSTRAINT IF EXISTS services_hourly_rate_nonneg;
-- ALTER TABLE bookings_v2 DROP CONSTRAINT IF EXISTS bookings_v2_quoted_price_nonneg;
-- ALTER TABLE bookings_v2 DROP CONSTRAINT IF EXISTS bookings_v2_final_price_nonneg;


-- =============================================================
-- STEP 3 — missing updated_at columns (nullable-safe: backfilled from
-- created_at so no row is ever NULL after this runs)
-- =============================================================
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE admin_users SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE activity_logs SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE assistant_messages SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE assistant_action_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE assistant_action_logs SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE lead_form_fields ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE lead_form_fields SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE asset_usage ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE asset_usage SET updated_at = used_at WHERE updated_at IS NULL;

ALTER TABLE revenue_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE revenue_transactions SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE customer_interactions SET updated_at = created_at WHERE updated_at IS NULL;

-- Rollback:
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE activity_logs DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE assistant_messages DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE assistant_action_logs DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE lead_form_fields DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE asset_usage DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE revenue_transactions DROP COLUMN IF EXISTS updated_at;
-- ALTER TABLE customer_interactions DROP COLUMN IF EXISTS updated_at;


-- =============================================================
-- STEP 4 — missing is_deleted columns (default false, matches the
-- soft-delete pattern used on every other table)
-- =============================================================
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assistant_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assistant_action_logs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Rollback:
-- ALTER TABLE reviews DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE admin_users DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE payment_methods DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE email_templates DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE activity_logs DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE assistant_messages DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE assistant_action_logs DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS is_deleted;
