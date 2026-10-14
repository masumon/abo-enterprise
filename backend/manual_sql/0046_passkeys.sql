-- 0046: passkeys — fingerprint / face / screen-lock sign-in (WebAuthn). 2026-10-15.
-- Additive (new table only). Safe to run more than once. Run in Supabase BEFORE the Render deploy.
CREATE TABLE IF NOT EXISTS passkeys (
    id UUID PRIMARY KEY,
    owner_type VARCHAR(20) NOT NULL,
    owner_ref VARCHAR(255) NOT NULL,
    credential_id VARCHAR(512) NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count BIGINT DEFAULT 0,
    transports JSON DEFAULT '[]',
    name VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_passkeys_owner_type ON passkeys (owner_type);
CREATE INDEX IF NOT EXISTS ix_passkeys_owner_ref ON passkeys (owner_ref);
CREATE INDEX IF NOT EXISTS ix_passkeys_credential_id ON passkeys (credential_id);
SELECT count(*) AS passkeys_table_ready FROM passkeys;
