-- 0045: optional video link on products and services (admin forms, 2026-10-14).
-- Safe to run more than once. Run in Supabase SQL editor BEFORE the Render deploy.
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS video_url TEXT;
SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'video_url' AND table_name IN ('products','services');
