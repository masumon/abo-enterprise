-- 0049: small read-performance indexes suggested by Supabase Query Performance (2026-10-16).
-- Additive, safe to run more than once, no data change. Order of benefit is small: the
-- queries already average 1–4 ms; these just keep the most frequent ones cheap as data grows.
CREATE INDEX IF NOT EXISTS idx_services_active_sort ON public.services (sort_order) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_not_deleted ON public.categories (sort_order) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_orders_created_at_live ON public.orders (created_at DESC) WHERE is_deleted = false;
