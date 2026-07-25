-- ============================================================================
-- ABO Enterprise — Service Module Audit: ALL migrations in one file
--
-- Run this ONCE in the Supabase SQL editor. It replaces alembic revisions
-- 0011 → 0016 for deployments that apply schema changes manually.
--
-- SAFE TO RUN AND RE-RUN:
--   * every DDL uses IF NOT EXISTS / IF EXISTS
--   * every backfill is idempotent (guarded by IS NULL or ON CONFLICT)
--   * nothing is ever DROPped — no column, no table, no data
--   * wrapped in a transaction: it either fully applies or fully rolls back
--
-- Order matters: section 5 depends on the columns added in sections 1-4.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Per-category SEO overrides                                    (0011)
--    Category landing pages could only derive metadata from their name.
-- ---------------------------------------------------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title       VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_keywords    VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS canonical_url   VARCHAR(500);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS og_image        TEXT;

-- ---------------------------------------------------------------------------
-- 2. Normalized booking location                                   (0012)
--    District/upazila were concatenated into the free-text details column.
--    Existing rows keep their prefixed text — nothing is rewritten.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS upazila  VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_bookings_v2_district ON bookings_v2 (district);

-- ---------------------------------------------------------------------------
-- 3. Optional appointment scheduling                               (0013)
--    scheduling_enabled defaults FALSE, so every existing service keeps its
--    current behaviour: booking_date stays an unconstrained preferred date.
-- ---------------------------------------------------------------------------
ALTER TABLE services ADD COLUMN IF NOT EXISTS scheduling_enabled    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_capacity         INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_notice_hours      INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_horizon_days  INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS working_hours         JSONB DEFAULT '{}'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS holidays              JSONB DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS ix_bookings_v2_service_slot
    ON bookings_v2 (service_id, booking_date);

-- ---------------------------------------------------------------------------
-- 4. Reviews for services + coupons on bookings                    (0016)
--    Applied before section 5 so the merge below has every column it needs.
-- ---------------------------------------------------------------------------
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_id UUID
    REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_reviews_service_id ON reviews (service_id);

ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS coupon_code     VARCHAR(50);
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5. Unify the service category system                             (0014)
--    services.category (legacy free string, underscores) and category_id
--    (FK into the categories tree, hyphen slugs) never intersected. Backfill
--    the FK, then make the string a cache of the linked node's slug so both
--    always agree. Unmatched services are left exactly as they are.
-- ---------------------------------------------------------------------------

-- 5a. Direct match — the string already equals a slug, or differs only by
--     underscores. No guessing.
UPDATE services s
   SET category_id = c.id
  FROM categories c
 WHERE s.category_id IS NULL
   AND s.is_deleted = FALSE
   AND c.is_deleted = FALSE
   AND c.slug = REPLACE(s.category, '_', '-');

-- 5b. Curated aliases for the pairs that don't normalise cleanly.
UPDATE services s
   SET category_id = c.id
  FROM categories c,
       (VALUES
          ('digital_services',   'digital-e-services'),
          ('print_documentation','printing-documentation'),
          ('printing',           'printing-documentation'),
          ('mobile_software',    'mobile-lab'),
          ('computer_software',  'it-support'),
          ('business_software',  'business-consultancy'),
          ('ai_solutions',       'ai-automation'),
          ('automation',         'ai-automation'),
          ('web_software',       'web-software'),
          ('web_development',    'web-software'),
          ('software',           'web-software'),
          ('general',            'others')
       ) AS m(legacy, slug)
 WHERE s.category_id IS NULL
   AND s.is_deleted = FALSE
   AND c.is_deleted = FALSE
   AND s.category = m.legacy
   AND c.slug = m.slug;

-- 5c. The string becomes a cache of the linked node's slug.
UPDATE services s
   SET category = c.slug
  FROM categories c
 WHERE s.category_id = c.id
   AND s.is_deleted = FALSE
   AND s.category IS DISTINCT FROM c.slug;

-- ---------------------------------------------------------------------------
-- 6. Merge the legacy booking table into bookings_v2               (0015)
--    service_id becomes nullable so intake with no catalog service behind it
--    (the printing/legal pages) lives in the same table. The old `bookings`
--    table is KEPT untouched as an archive — this only copies out of it.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings_v2 ALTER COLUMN service_id DROP NOT NULL;

INSERT INTO bookings_v2 (
    id, booking_number, service_id, service_name, customer_name,
    customer_phone, customer_email, details, status, pricing_type,
    payment_status, notes, created_at, updated_at, is_deleted
)
SELECT
    b.id,
    b.booking_number,
    s.id,
    COALESCE(
        s.name_en,
        INITCAP(REPLACE(b.service_type, '_', ' '))
          || COALESCE(' — ' || INITCAP(REPLACE(b.service_subtype, '_', ' ')), '')
    ),
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    b.details,
    CASE WHEN b.status = 'contacted' THEN 'confirmed' ELSE b.status END,
    'custom_quote',
    'pending',
    'Migrated from the legacy booking system.'
      || COALESCE(' Estimated price: ' || b.estimated_price, ''),
    b.created_at,
    b.updated_at,
    b.is_deleted
  FROM bookings b
  LEFT JOIN services s
    ON s.is_deleted = FALSE
   AND s.slug = REPLACE(b.service_type, '_', '-')
 ON CONFLICT (booking_number) DO NOTHING;

COMMIT;

-- ============================================================================
-- Verify (optional) — run after COMMIT:
--
--   SELECT COUNT(*) FILTER (WHERE category_id IS NULL) AS unlinked_services,
--          COUNT(*) AS total_services
--     FROM services WHERE is_deleted = FALSE;
--
--   SELECT (SELECT COUNT(*) FROM bookings)    AS legacy_rows,
--          (SELECT COUNT(*) FROM bookings_v2) AS unified_rows;
-- ============================================================================
