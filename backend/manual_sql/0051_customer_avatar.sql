-- 2026-10-17: customer's own profile photo (shown on every device).
-- Run in Supabase → SQL Editor BEFORE merging/deploying the backend.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
