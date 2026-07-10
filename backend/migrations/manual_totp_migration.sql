-- ========================================================================
-- ABO Enterprise: TOTP Two-Factor Authentication Migration
-- ========================================================================
-- Purpose: Add TOTP 2FA support columns to admin_users table
-- Date: 2026-07-10
-- Status: COMPLETED (manually executed in Supabase)
-- Note: This migration was run manually to avoid Render auto-deploy issues
--       with free tier. Alembic version 0004 has been removed from codebase.
-- ========================================================================

-- Step 1: Add TOTP secret column
-- Stores the base32-encoded TOTP secret key for authenticator apps
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS totp_secret TEXT;

COMMENT ON COLUMN admin_users.totp_secret IS 
'Base32-encoded TOTP secret key for authenticator apps (Google Authenticator, Authy, etc.)';

-- Step 2: Add TOTP enabled flag
-- Tracks whether the admin user has enabled two-factor authentication
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN admin_users.totp_enabled IS 
'Indicates if two-factor authentication is enabled for this admin account';

-- Step 3: Verify migration success
-- Expected result: 2 rows showing both columns with correct data types
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE 
        WHEN column_name = 'totp_secret' THEN '✓ Stores TOTP secret key'
        WHEN column_name = 'totp_enabled' THEN '✓ 2FA activation flag'
    END as description
FROM information_schema.columns
WHERE table_name = 'admin_users' 
  AND column_name IN ('totp_secret', 'totp_enabled')
ORDER BY column_name;

-- ========================================================================
-- Migration History
-- ========================================================================
-- 2026-07-10: Initial manual execution in Supabase production database
--             Columns added successfully, verified via SELECT query
-- ========================================================================
