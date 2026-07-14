-- ============================================================================
-- ABO Enterprise — Commerce Capabilities (Orderable / Bookable overrides)
-- Manual mirror of Alembic migration 0005_commerce_capabilities.py
--
-- নিরাপদ / SAFE: শুধু ৪টা nullable কলাম যোগ করে। কোনো ডেটা মুছে না, কিছু বদলায় না।
-- সব পুরনো সারিতে মান NULL থাকবে → আচরণ আগের মতোই (product=orderable, service=bookable)।
-- একবারে পুরোটা Supabase SQL Editor-এ পেস্ট করে Run করুন।
--
-- NOTE: deploy-এ `alembic upgrade head` নিজেই এটা চালায়। ম্যানুয়াল রান ঐচ্ছিক।
-- ============================================================================

BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bookable  BOOLEAN;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_orderable BOOLEAN;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_bookable  BOOLEAN;

COMMIT;

-- ঐচ্ছিক / OPTIONAL: Alembic যেন deploy-এ আবার না চালায় (DB এখন 0004-এ থাকতে হবে):
-- UPDATE alembic_version SET version_num = '0005' WHERE version_num = '0004';

-- যাচাই / VERIFY:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('products','services')
--     AND column_name IN ('is_orderable','is_bookable');
