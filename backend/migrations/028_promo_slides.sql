-- 028_promo_slides.sql — admin-managed promo carousels (hero + flash sale).
--
-- Run once in Supabase. Additive and idempotent — safe to re-run.
-- Nothing is dropped; the existing hero_promo_media_url setting keeps working
-- as a fallback when no slide is configured.

CREATE TABLE IF NOT EXISTS promo_slides (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement   VARCHAR(40)  NOT NULL DEFAULT 'hero',
    image_url   TEXT,
    video_url   TEXT,
    link_url    TEXT,
    title_en    VARCHAR(255),
    title_bn    VARCHAR(255),
    alt_text    VARCHAR(255),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at   TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_promo_slides_placement ON promo_slides (placement);
CREATE INDEX IF NOT EXISTS ix_promo_slides_is_active ON promo_slides (is_active);
