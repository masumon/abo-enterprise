-- 0036_transaction_customer_fk.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: purely additive. Adds nullable FK columns only, no ALTER/DROP on
-- existing columns, no data mutation. Existing rows get customer_id = NULL;
-- a bulk backfill (matching the same phone logic as
-- app.core.customer_master.get_or_create_customer) is a separate, reviewed
-- follow-up script if wanted, same as the customer_master backfill itself.

BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS ix_orders_customer_id ON orders(customer_id);

ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS ix_bookings_v2_customer_id ON bookings_v2(customer_id);

ALTER TABLE leads_v2 ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS ix_leads_v2_customer_id ON leads_v2(customer_id);

COMMIT;
