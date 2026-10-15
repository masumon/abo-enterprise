-- 0047: Supabase Security Advisor warnings (2026-10-16). No table or data changes.
-- Safe to run more than once. The app connects as the database owner, so nothing here
-- affects the website; it only closes doors that the public Supabase REST API could use.
--
-- 1) function_search_path_mutable: pin search_path on the two trigger functions.
-- 2) anon/authenticated_security_definer_function_executable: rls_auto_enable() must not be
--    callable through /rest/v1/rpc. Triggers do not need EXECUTE, so they keep working.
BEGIN;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('record_product_stock_change', 'sync_product_brand_master')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;

  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

COMMIT;

-- Check (should list the two functions with search_path set, and no anon/authenticated EXECUTE):
-- SELECT p.proname, p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--  WHERE n.nspname='public' AND p.proname IN ('record_product_stock_change','sync_product_brand_master');
-- SELECT has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE');
