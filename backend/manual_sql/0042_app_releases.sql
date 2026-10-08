-- 0042_app_releases.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: additive only. Creates two NEW tables (nothing existing is touched or changed).
-- Idempotent — safe to run twice.
--
-- For the "Apon" mobile-app download page: app_releases (admin-managed builds; the file
-- address is private) and app_download_events (download counter; IP stored only as a hash).
--
-- Run in: Supabase Dashboard -> SQL Editor -> paste -> Run.   (Run BEFORE deploying Render.)

BEGIN;

CREATE TABLE IF NOT EXISTS app_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_name VARCHAR(40) NOT NULL,
    version_code INTEGER NOT NULL UNIQUE,
    file_name VARCHAR(120) NOT NULL,
    source_url TEXT NOT NULL,
    size_bytes BIGINT,
    sha256 VARCHAR(64),
    min_android VARCHAR(20),
    changelog_bn TEXT,
    changelog_en TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS app_download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id UUID REFERENCES app_releases(id) ON DELETE SET NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_app_download_events_ip_hash ON app_download_events (ip_hash);
CREATE INDEX IF NOT EXISTS ix_app_download_events_created_at ON app_download_events (created_at);

COMMIT;

-- Check (should return 2 rows):
-- SELECT table_name FROM information_schema.tables
--  WHERE table_name IN ('app_releases','app_download_events');
