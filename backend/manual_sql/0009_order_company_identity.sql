-- 0009_order_company_identity.sql
-- GAP / Artifact reference: X4 (institutional invoice identity on orders)
--
-- WHY
-- Orders carry customer_name, customer_phone and customer_email but no company
-- identity. When an institution buys, the invoice is issued in an individual's
-- name, which is not acceptable for their bookkeeping, and government purchases
-- cannot be settled at all without a purchase-order number on the bill.
-- LeadV2 already carries `company`; orders do not, so the identity is lost at
-- the exact point it becomes a financial record.
--
-- SAFETY
-- Additive and nullable. Personal orders leave every column NULL and behave
-- exactly as today. No backfill, no default, no change to totals, tax,
-- payment status or invoice generation. Safe to run while live.
--
-- ROLLBACK
--   ALTER TABLE orders DROP COLUMN IF EXISTS company_name;
--   ALTER TABLE orders DROP COLUMN IF EXISTS company_bin;
--   ALTER TABLE orders DROP COLUMN IF EXISTS company_tin;
--   ALTER TABLE orders DROP COLUMN IF EXISTS po_number;
--   ALTER TABLE orders DROP COLUMN IF EXISTS billing_address;
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS company_name    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_bin     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS company_tin     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS po_number       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_address TEXT;

COMMENT ON COLUMN orders.company_name    IS 'Institution the invoice is issued to. NULL = personal order.';
COMMENT ON COLUMN orders.company_bin     IS 'Business Identification Number, printed on the invoice when present.';
COMMENT ON COLUMN orders.company_tin     IS 'Tax Identification Number, optional.';
COMMENT ON COLUMN orders.po_number       IS 'Buyer purchase-order reference; government bills are not settled without it.';
COMMENT ON COLUMN orders.billing_address IS 'Billing address when it differs from delivery_address.';

-- Partial index: only institutional orders are indexed, so personal orders add
-- no write cost. Uncomment if company lookups are needed in admin reporting.
-- CREATE INDEX IF NOT EXISTS idx_orders_company_name
--     ON orders (company_name) WHERE company_name IS NOT NULL;
