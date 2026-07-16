-- ============================================================================
-- ABO Enterprise — ডুপ্লিকেট সেবা রিটায়ার (soft delete)
-- Manual mirror of Alembic migration 0007_dedupe_services.py
--
-- নিরাপদ / SAFE: কিছুই hard-delete হয় না — শুধু is_deleted=TRUE হয়, বুকিং
-- ইতিহাস অক্ষত থাকে। curated সেবাটি (দ্বিতীয় কলাম) DB-তে থাকলে তবেই
-- bootstrap ডুপ্লিকেটটি লুকানো হয়। বারবার চালালে সমস্যা নেই।
--
-- জোড়াগুলো:
--   printing    → printing-service        (Printing Service)
--   legal       → legal-services          (Legal Case Writing)
--   software    → custom-software         (Custom Software Development)
--   web-design  → website-development     (Website Development)
--   mobile-app  → mobile-app-development  (Mobile App Development)
-- ============================================================================

BEGIN;

UPDATE services dup
SET is_deleted = TRUE, is_active = FALSE
FROM (VALUES
    ('printing',   'printing-service'),
    ('legal',      'legal-services'),
    ('software',   'custom-software'),
    ('web-design', 'website-development'),
    ('mobile-app', 'mobile-app-development')
) AS pairs(dup_slug, keep_slug)
WHERE dup.slug = pairs.dup_slug
  AND dup.is_deleted = FALSE
  AND EXISTS (
    SELECT 1 FROM services keeper
    WHERE keeper.slug = pairs.keep_slug AND keeper.is_deleted = FALSE
  );

COMMIT;
