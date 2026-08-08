-- 032_product_import_jobs.sql — audit history for the admin Bulk Product Import.
--
-- Run once in Supabase (SQL editor). Additive and idempotent — safe to re-run.
-- Nothing is dropped. This table only records what each import run did; it is
-- never read by the storefront, checkout, or order flow.

CREATE TABLE IF NOT EXISTS product_import_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id       UUID,
    filename       VARCHAR(255),
    total_rows     INTEGER NOT NULL DEFAULT 0,
    created_count  INTEGER NOT NULL DEFAULT 0,
    updated_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count  INTEGER NOT NULL DEFAULT 0,
    error_count    INTEGER NOT NULL DEFAULT 0,
    errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_product_import_jobs_created ON product_import_jobs (created_at DESC);
