-- 0025_archive_dead_tables — non-destructive cleanup of 5 tables confirmed
-- to have ZERO application code referencing them (verified by repo-wide
-- grep: no route, service, or script imports RevenueTransaction,
-- CustomerInteraction, LeadFormField, AssetUsage, or AdminSetting outside
-- their own model definition — and no frontend code calls the old
-- /api/v1/admin/settings* endpoints that used to read/write AdminSetting;
-- those routes have been removed from admin_settings.py in this same
-- change, leaving only its live PaymentMethod endpoints).
--
-- This does NOT drop anything. It renames each table to `_archived_<name>`
-- so all data is fully preserved and trivially recoverable (just rename it
-- back) — a safer "backup" than a separate pg_dump step, and it takes the
-- table out of the live schema namespace immediately.
--
-- Foreign keys pointing at these tables (none currently do — checked) would
-- keep working across a rename regardless, since Postgres tracks
-- constraints by object OID, not by name.
--
-- Safe to run multiple times (IF EXISTS everywhere).
-- Mirrors alembic/versions/0025_archive_dead_tables.py.
--
-- ⚠ NOT included here: `subcategories`. Its table looks superseded by the
-- unified `categories` self-join tree, but `products.subcategory_id` and
-- `services.subcategory_id` are still live columns in the create/update
-- schemas — whether any row still depends on that table could not be fully
-- verified from code alone, so it is deliberately left untouched pending
-- your confirmation.

ALTER TABLE IF EXISTS revenue_transactions RENAME TO _archived_revenue_transactions;
ALTER TABLE IF EXISTS customer_interactions RENAME TO _archived_customer_interactions;
ALTER TABLE IF EXISTS lead_form_fields RENAME TO _archived_lead_form_fields;
ALTER TABLE IF EXISTS asset_usage RENAME TO _archived_asset_usage;
ALTER TABLE IF EXISTS admin_settings RENAME TO _archived_admin_settings;

COMMENT ON TABLE _archived_revenue_transactions IS 'Archived 2026-08-05 — unused, no app code references this table. Safe to DROP after a confirmation period.';
COMMENT ON TABLE _archived_customer_interactions IS 'Archived 2026-08-05 — unused, no app code references this table. Safe to DROP after a confirmation period.';
COMMENT ON TABLE _archived_lead_form_fields IS 'Archived 2026-08-05 — unused, no app code references this table. Safe to DROP after a confirmation period.';
COMMENT ON TABLE _archived_asset_usage IS 'Archived 2026-08-05 — unused, no app code references this table. Safe to DROP after a confirmation period.';
COMMENT ON TABLE _archived_admin_settings IS 'Archived 2026-08-05 — superseded by the settings table/API; its own /api/v1/admin/settings* routes were removed. Safe to DROP after a confirmation period.';

-- ─────────────────────────────────────────────────────────────────────────
-- OPTIONAL — final removal. Left commented out on purpose: only run this
-- block yourself, later, once you've confirmed (e.g. after a few weeks in
-- production with no errors referencing these tables) that they're truly
-- safe to lose for good.
-- ─────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS _archived_revenue_transactions;
-- DROP TABLE IF EXISTS _archived_customer_interactions;
-- DROP TABLE IF EXISTS _archived_lead_form_fields;
-- DROP TABLE IF EXISTS _archived_asset_usage;
-- DROP TABLE IF EXISTS _archived_admin_settings;
