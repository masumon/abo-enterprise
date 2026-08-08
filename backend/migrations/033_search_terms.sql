-- 033_search_terms.sql — popular-search analytics for the storefront search.
--
-- Run once in Supabase (SQL editor). Additive and idempotent — safe to re-run.
-- Nothing is dropped. Only records how often each term is searched; never read
-- by the order/checkout path. If this table is absent, search still works and
-- the "popular" suggestions section simply stays empty.

CREATE TABLE IF NOT EXISTS search_terms (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term       VARCHAR(100) NOT NULL UNIQUE,
    count      INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_search_terms_count ON search_terms (count DESC);
