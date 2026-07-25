-- 025_category_seo.sql — per-category SEO overrides.
--
-- Manual mirror of alembic/versions/0011_category_seo.py. Category landing
-- pages could only derive metadata from name_en/description_en; these give
-- them the same optional overrides services already have.
-- Additive and idempotent — safe to re-run.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS og_image TEXT;
