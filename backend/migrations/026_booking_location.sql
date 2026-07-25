-- 026_booking_location.sql — normalized district/upazila on service bookings.
-- Manual mirror of alembic/versions/0012_booking_location.py.
-- Additive and idempotent — safe to re-run.

ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS upazila VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_bookings_v2_district ON bookings_v2 (district);
