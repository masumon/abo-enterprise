-- ABO Enterprise — Extended product & service columns
-- Migration: 003_product_service_extensions.sql
-- Run after 001_initial_schema.sql (and 004 for services table)

-- Products: fields added to ORM after initial schema
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_info TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Services: SEO and content blocks (requires 004_services_system.sql)
ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;

-- Service booking forms
ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS default_value TEXT;
ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS validation_rules JSONB;
ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS conditional_logic JSONB;

-- Reviews admin reply
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
