-- 0010_invoice_company_identity.sql
-- GAP / Artifact reference: X4 (institutional invoice identity — permanent copy)
--
-- WHY
-- 0009 put the company identity on `orders`, and the PDF invoice reads it from
-- there at render time. An invoice is meant to be a permanent record of what
-- was agreed, and it already keeps its own copy of the customer name, phone,
-- email, item lines and totals for exactly that reason. The company identity is
-- the one part still borrowed from the live order, so if that order is ever
-- deleted or edited, an already-issued invoice silently reprints in a different
-- name. These columns give the invoice its own copy, like every other field on
-- it.
--
-- SAFETY
-- Additive and nullable. Existing invoices leave every column NULL and continue
-- to render from the order exactly as they do today (the PDF builder falls back
-- to the order, and will keep doing so for NULL rows). No backfill, no default,
-- no change to totals, tax, payment status or invoice numbering. Safe to run
-- while live.
--
-- ORDER
-- Run after 0009_order_company_identity.sql, which is already applied.
--
-- AFTER RUNNING
-- Tell me it is applied. Only then will the Invoice model map these columns —
-- mapping them before the columns exist would break every invoice read in
-- production, which is why 0008 and 0009 were wired the same way.
--
-- ROLLBACK
--   ALTER TABLE invoices DROP COLUMN IF EXISTS company_name;
--   ALTER TABLE invoices DROP COLUMN IF EXISTS company_bin;
--   ALTER TABLE invoices DROP COLUMN IF EXISTS company_tin;
--   ALTER TABLE invoices DROP COLUMN IF EXISTS po_number;
--   ALTER TABLE invoices DROP COLUMN IF EXISTS billing_address;
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually.

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS company_name    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_bin     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS company_tin     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS po_number       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS billing_address TEXT;

COMMENT ON COLUMN invoices.company_name    IS 'Institution this invoice was issued to, copied from the order at issue time. NULL = personal order, or issued before 0010.';
COMMENT ON COLUMN invoices.company_bin     IS 'Business Identification Number as printed on this invoice.';
COMMENT ON COLUMN invoices.company_tin     IS 'Tax Identification Number as printed on this invoice.';
COMMENT ON COLUMN invoices.po_number       IS 'Buyer purchase-order reference as printed on this invoice.';
COMMENT ON COLUMN invoices.billing_address IS 'Billing address as printed on this invoice.';
