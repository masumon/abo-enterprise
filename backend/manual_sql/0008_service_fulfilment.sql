-- 0008_service_fulfilment.sql
-- GAP / Artifact reference: V10 (service fulfilment mode)
--
-- WHY
-- The Service model already distinguishes how a service is *started*
-- (is_orderable, is_bookable, pricing_type = fixed|hourly|package|custom_quote),
-- but nothing records where it is *completed*. Services such as passport photo,
-- biometric capture, original-document verification and mobile servicing require
-- the customer to come to the shop. With no field for this, a customer books
-- online and waits at home for a service that can never be delivered remotely.
--
-- SAFETY
-- Additive and nullable. NULL preserves the current behaviour exactly, so every
-- existing row and every existing code path is unaffected. No backfill, no
-- rewrite, no default that changes meaning. Safe to run while live.
--
-- ROLLBACK
--   ALTER TABLE services DROP COLUMN IF EXISTS fulfilment;
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually.

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS fulfilment VARCHAR(20);

COMMENT ON COLUMN services.fulfilment IS
    'Where the service is completed: remote | at_shop | hybrid. NULL = unspecified (current behaviour).';

-- Optional guard. Enable only after confirming no existing row would violate it
-- (all rows are NULL immediately after the ALTER above, so it is safe at that point).
-- ALTER TABLE services
--     ADD CONSTRAINT services_fulfilment_check
--     CHECK (fulfilment IS NULL OR fulfilment IN ('remote', 'at_shop', 'hybrid'));
