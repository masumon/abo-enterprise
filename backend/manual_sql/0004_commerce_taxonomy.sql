-- ============================================================================
-- ABO Enterprise — Commerce Taxonomy (Category -> Subcategory)
-- Manual mirror of Alembic migration 0004_commerce_taxonomy.py
--
-- নিরাপদ / SAFE: পুরোটা additive। কোনো পুরনো টেবিল/কলাম/ডেটা মুছে না।
-- বারবার চালালেও সমস্যা নেই (IF NOT EXISTS / ON CONFLICT / guarded blocks).
-- একবারে পুরো ব্লকটা Supabase SQL Editor-এ পেস্ট করে Run করুন।
--
-- NOTE: ডিপ্লয়ের সময় `alembic upgrade head` নিজেই এটা চালায়। তাই ম্যানুয়াল রান
-- ঐচ্ছিক — আগে চালালেও deploy-এ আবার নিরাপদে স্কিপ/রি-রান হবে।
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. categories টেবিল
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255),
    description_en TEXT,
    description_bn TEXT,
    icon VARCHAR(80),
    image_url TEXT,
    applies_to JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ---------------------------------------------------------------------------
-- 2. subcategories টেবিল
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    slug VARCHAR(120) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255),
    description_en TEXT,
    description_bn TEXT,
    icon VARCHAR(80),
    image_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_subcategory_category_slug UNIQUE (category_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON subcategories(is_active);

-- ---------------------------------------------------------------------------
-- 3. products / services — নতুন FK কলাম (nullable, additive)
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE services ADD COLUMN IF NOT EXISTS subcategory_id UUID;

-- Foreign key constraint (একবারই যোগ হবে)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_category') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_category
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_subcategory') THEN
    ALTER TABLE products ADD CONSTRAINT fk_products_subcategory
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_services_category') THEN
    ALTER TABLE services ADD CONSTRAINT fk_services_category
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_services_subcategory') THEN
    ALTER TABLE services ADD CONSTRAINT fk_services_subcategory
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_subcategory_id ON services(subcategory_id);

-- ---------------------------------------------------------------------------
-- 4. পুরনো string category থেকে taxonomy ভরে দেওয়া (backfill)
-- ---------------------------------------------------------------------------
-- product-এর category -> categories (applies_to = product)
INSERT INTO categories (slug, name_en, applies_to, is_active)
SELECT DISTINCT lower(btrim(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) AS slug,
       category, '["product"]'::jsonb, TRUE
FROM products
WHERE category IS NOT NULL AND btrim(category) <> ''
  AND lower(btrim(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) <> ''
ON CONFLICT (slug) DO NOTHING;

-- service-এর category -> categories (applies_to তে service যোগ)
INSERT INTO categories (slug, name_en, applies_to, is_active)
SELECT DISTINCT lower(btrim(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) AS slug,
       category, '["service"]'::jsonb, TRUE
FROM services
WHERE category IS NOT NULL AND btrim(category) <> ''
  AND lower(btrim(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) <> ''
ON CONFLICT (slug) DO UPDATE
  SET applies_to = CASE
    WHEN categories.applies_to @> '["service"]'::jsonb THEN categories.applies_to
    ELSE categories.applies_to || '["service"]'::jsonb
  END;

-- product-এর sub_category -> subcategories
INSERT INTO subcategories (category_id, slug, name_en, is_active)
SELECT DISTINCT c.id,
       lower(btrim(regexp_replace(p.sub_category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) AS slug,
       p.sub_category, TRUE
FROM products p
JOIN categories c ON c.slug = lower(btrim(regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g'), '-'))
WHERE p.sub_category IS NOT NULL AND btrim(p.sub_category) <> ''
  AND lower(btrim(regexp_replace(p.sub_category, '[^a-zA-Z0-9]+', '-', 'g'), '-')) <> ''
ON CONFLICT (category_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. products / services-এর FK কলাম slug মিলিয়ে ভরে দেওয়া
-- ---------------------------------------------------------------------------
UPDATE products p SET category_id = c.id
FROM categories c
WHERE p.category_id IS NULL
  AND c.slug = lower(btrim(regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g'), '-'));

UPDATE products p SET subcategory_id = s.id
FROM subcategories s
WHERE p.subcategory_id IS NULL
  AND p.category_id IS NOT NULL
  AND s.category_id = p.category_id
  AND s.slug = lower(btrim(regexp_replace(p.sub_category, '[^a-zA-Z0-9]+', '-', 'g'), '-'));

UPDATE services sv SET category_id = c.id
FROM categories c
WHERE sv.category_id IS NULL
  AND c.slug = lower(btrim(regexp_replace(sv.category, '[^a-zA-Z0-9]+', '-', 'g'), '-'));

COMMIT;

-- ============================================================================
-- ঐচ্ছিক / OPTIONAL: যদি আপনি চান Alembic এই মাইগ্রেশনটা deploy-এ আবার না চালাক,
-- তাহলে নিচের লাইনটা আন-কমেন্ট করে চালান (আপনার DB এখন 0003-এ থাকতে হবে):
--
-- UPDATE alembic_version SET version_num = '0004' WHERE version_num = '0003';
-- ============================================================================

-- যাচাই / VERIFY (রান করে দেখতে পারেন কতগুলো সারি ভরেছে):
-- SELECT count(*) AS categories FROM categories;
-- SELECT count(*) AS subcategories FROM subcategories;
-- SELECT count(*) AS products_linked FROM products WHERE category_id IS NOT NULL;
-- SELECT count(*) AS services_linked FROM services WHERE category_id IS NOT NULL;
