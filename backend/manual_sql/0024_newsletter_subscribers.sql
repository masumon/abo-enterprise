-- 0024_newsletter_subscribers — real table replacing the
-- newsletter_subscribers Setting JSON blob (no timestamps, no unsubscribe
-- state, and a check-then-write race under concurrent signups).
--
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT everywhere).
-- Mirrors alembic/versions/0024_newsletter_subscribers.py.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(50),
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- One-time backfill: migrate any existing emails out of the old
-- settings.newsletter_subscribers JSON blob into the new table. Harmless to
-- re-run — ON CONFLICT (email) DO NOTHING makes it idempotent.
INSERT INTO newsletter_subscribers (email, source)
SELECT DISTINCT lower(trim(elem)), 'legacy_import'
FROM settings s,
     LATERAL jsonb_array_elements_text(
         CASE WHEN s.value IS NOT NULL AND s.value <> '' THEN s.value::jsonb ELSE '[]'::jsonb END
     ) AS elem
WHERE s.key = 'newsletter_subscribers'
  AND s.is_deleted = FALSE
  AND trim(elem) <> ''
ON CONFLICT (email) DO NOTHING;

-- The old JSON blob setting is left in place (harmless, no longer read by
-- the app after this migration's paired code change) rather than deleted
-- here, so this script stays a pure additive migration.
