-- 023_contact_email.sql
-- Set the public contact email to info@aboenterprise.com everywhere it is read
-- from the DB (invoice footer, site footer, contact & privacy pages all use the
-- `contact_email` setting). Needed because startup bootstrap is disabled on
-- Render, so the seeded default never runs. Idempotent — run in Supabase.
BEGIN;

INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES ('contact_email', 'info@aboenterprise.com', 'string', 'Public contact email', TRUE)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Some invoices also read an optional business_email; keep it consistent.
INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES ('business_email', 'info@aboenterprise.com', 'string', 'Business email', TRUE)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

COMMIT;

-- VERIFY:
-- SELECT key, value FROM settings WHERE key IN ('contact_email','business_email');
