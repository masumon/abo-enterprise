-- 0039_pages_cms.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: purely additive. Creates a new table only, no ALTER/DROP/DELETE
-- on any existing table.

BEGIN;

CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    title_en VARCHAR(500) NOT NULL,
    title_bn VARCHAR(500),
    content_en TEXT NOT NULL,
    content_bn TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    canonical_url VARCHAR(500),
    og_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS ix_pages_status ON pages(status);

COMMIT;
