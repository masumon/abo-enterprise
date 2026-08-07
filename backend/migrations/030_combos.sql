-- 030_combos.sql — combo (bundle) packs: a set of products sold together at a
-- single combo price, optionally granting free delivery.
--
-- Run once in Supabase (SQL editor). Additive and idempotent — safe to re-run.
-- Nothing is dropped. combo_items cascade-delete with their combo and with the
-- referenced product, so the tables stay clean.
--
-- Pricing note: combo_price is the amount the customer pays for the whole
-- bundle. The order API re-derives it server-side (never trusts a client
-- total), the same rule single-product orders use.

CREATE TABLE IF NOT EXISTS combos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(255) NOT NULL UNIQUE,
    title_en         VARCHAR(255) NOT NULL,
    title_bn         VARCHAR(255) NOT NULL,
    description_en   TEXT,
    description_bn   TEXT,
    image_url        TEXT,
    combo_price      NUMERIC(10,2) NOT NULL,
    compare_at_price NUMERIC(10,2),
    badge_en         VARCHAR(80),
    badge_bn         VARCHAR(80),
    free_delivery    BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at        TIMESTAMPTZ,
    ends_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_combos_slug   ON combos (slug);
CREATE INDEX IF NOT EXISTS ix_combos_active ON combos (is_active);

CREATE TABLE IF NOT EXISTS combo_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id   UUID NOT NULL REFERENCES combos(id)   ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_combo_items_combo   ON combo_items (combo_id);
CREATE INDEX IF NOT EXISTS ix_combo_items_product ON combo_items (product_id);
