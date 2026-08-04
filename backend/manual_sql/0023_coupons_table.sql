-- 0023_coupons_table.sql
-- Real coupons table, replacing the coupons_json Setting blob.
--
-- WHY
-- Coupons lived entirely inside one Settings row as a hand-edited JSON
-- blob (admin/coupons/page.tsx was a structured editor over that JSON,
-- not a real CRUD screen). No table meant no FK integrity, no per-coupon
-- audit trail, and any malformed JSON silently fell back to two hardcoded
-- defaults (ABO10 10%, WELCOME 5% off orders >= 500) baked into
-- routes/coupons.py.
--
-- SAFETY
-- Purely additive — a new table, seeded with exactly the two coupons the
-- live site is currently running on (confirmed: the coupons_json Setting
-- row exists but is empty, so DEFAULT_COUPONS in coupons.py is what's
-- actually active today). The old coupons_json Setting is left untouched.
--
-- AFTER RUNNING
-- Tell me it is applied. The backend has already been updated to read
-- from this table (with the same two defaults seeded below, so behaviour
-- is identical the moment this table exists) — nothing else to do.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS coupons;
--
-- DO NOT EXECUTE AUTOMATICALLY — review, then run manually.

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent NUMERIC(5,2) NOT NULL,
    min_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

INSERT INTO coupons (code, discount_percent, min_subtotal, is_active)
VALUES
    ('ABO10', 10, 0, TRUE),
    ('WELCOME', 5, 500, TRUE)
ON CONFLICT (code) DO NOTHING;
