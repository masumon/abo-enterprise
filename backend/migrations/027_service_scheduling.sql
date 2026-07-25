-- 027_service_scheduling.sql — optional per-service scheduling.
-- Manual mirror of alembic/versions/0013_service_scheduling.py.
-- scheduling_enabled defaults FALSE, so existing services are unchanged.
-- Additive and idempotent — safe to re-run.

ALTER TABLE services ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_capacity INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS holidays JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS ix_bookings_v2_service_slot ON bookings_v2 (service_id, booking_date);
