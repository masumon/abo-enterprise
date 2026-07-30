-- 0011_service_turnaround.sql
-- Artifact reference: screen 08c (government services · mobile servicing)
--
-- WHY
-- The service catalogue can say what a service costs, how it is started and,
-- since 0008, where it is completed — but not how long it takes. Screen 08c
-- lists every government service with its turnaround ("3–5 working days",
-- "7–15 working days") because for an application the customer cannot chase
-- themselves, the wait *is* the product. Today that number lives only in the
-- shopkeeper's head, so the customer asks by phone and the answer varies.
--
-- Two columns rather than one: these are ranges in practice, and a single
-- "days" number would force the shop to either over-promise the fast case or
-- under-sell the normal one.
--
-- SAFETY
-- Additive and nullable. NULL on every existing row and the UI stays exactly as
-- it is today — a service with no turnaround set says nothing about time, which
-- is the current behaviour. No backfill, no default, no effect on pricing,
-- booking, scheduling or capabilities. Safe to run while live.
--
-- AFTER RUNNING
-- Tell me it is applied. Only then will the Service model map these columns —
-- mapping them before they exist would break every service read in production,
-- which is why 0008, 0009 and 0010 were wired the same way.
--
-- ROLLBACK
--   ALTER TABLE services DROP COLUMN IF EXISTS turnaround_days_min;
--   ALTER TABLE services DROP COLUMN IF EXISTS turnaround_days_max;
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually.

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS turnaround_days_min SMALLINT,
    ADD COLUMN IF NOT EXISTS turnaround_days_max SMALLINT;

COMMENT ON COLUMN services.turnaround_days_min IS
    'Fastest realistic completion in working days. NULL = not published (current behaviour).';
COMMENT ON COLUMN services.turnaround_days_max IS
    'Usual upper bound in working days. NULL = not published. Set both, or neither.';

-- Optional guard. Enable only after confirming no row violates it; every row is
-- NULL immediately after the ALTER above, so it is safe at that point.
-- ALTER TABLE services
--     ADD CONSTRAINT services_turnaround_check
--     CHECK (
--         (turnaround_days_min IS NULL AND turnaround_days_max IS NULL)
--         OR (turnaround_days_min > 0 AND turnaround_days_max >= turnaround_days_min)
--     );
