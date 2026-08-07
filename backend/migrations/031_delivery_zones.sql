-- 031_delivery_zones.sql — admin-defined delivery charges & free-delivery rules
-- per district (and optionally specific upazilas).
--
-- Run once in Supabase (SQL editor). Additive and idempotent — safe to re-run.
-- Nothing is dropped. When no zone matches a customer's district, checkout
-- falls back to the existing settings-based 3-tier charge, so nothing breaks.

CREATE TABLE IF NOT EXISTS delivery_zones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en        VARCHAR(120) NOT NULL,
    name_bn        VARCHAR(120) NOT NULL,
    districts      JSONB NOT NULL DEFAULT '[]'::jsonb,
    upazilas       JSONB NOT NULL DEFAULT '[]'::jsonb,
    charge         NUMERIC(10,2) NOT NULL DEFAULT 0,
    free_threshold NUMERIC(10,2),
    sort_order     INTEGER NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_delivery_zones_active ON delivery_zones (is_active);
