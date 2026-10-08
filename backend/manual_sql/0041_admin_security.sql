-- 0041_admin_security.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: additive only. Adds five columns to admin_users (three have a default so
-- existing rows stay valid); nothing is changed or removed. Idempotent — safe to run twice.
--
-- Needed by the admin sign-in hardening release (recovery codes, one-time TOTP codes,
-- per-account lockout, "sign out of all devices"). Without these columns every admin
-- sign-in fails with: column admin_users.totp_recovery_codes does not exist.
--
-- Run in: Supabase Dashboard -> SQL Editor -> paste -> Run.

BEGIN;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_recovery_codes TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

COMMIT;

-- Check (should return 5 rows):
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'admin_users'
--    AND column_name IN ('totp_recovery_codes','totp_last_step','token_version','failed_login_count','locked_until');
