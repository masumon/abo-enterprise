-- 022_site_url_setting.sql
-- Fix the "View in Admin" / order-tracking links in emails that opened the wrong
-- domain (beweranto.vercel.app). Those links come from the site base URL; this
-- sets the admin-editable `site_url` setting, which resolve_site_url() prefers
-- over the FRONTEND_URL env.
--
-- Needed because startup bootstrap is disabled on Render
-- (STARTUP_BOOTSTRAP_ENABLED=false), so the seeded default never runs.
-- Requires PR #173 (resolve_site_url) deployed. Idempotent — run in Supabase.
BEGIN;

INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES (
    'site_url',
    'https://www.aboenterprise.com',
    'string',
    'Public site base URL for email links (View in Admin, order tracking)',
    TRUE
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;

-- VERIFY:
-- SELECT key, value FROM settings WHERE key = 'site_url';
