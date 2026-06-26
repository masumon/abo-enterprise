-- ABO Enterprise — Initial Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    category TEXT NOT NULL,
    badge TEXT,
    image_url TEXT,
    images JSONB DEFAULT '[]',
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_address TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    payment_number TEXT,
    payment_status TEXT DEFAULT 'pending',
    order_status TEXT DEFAULT 'pending',
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_charge NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number TEXT UNIQUE NOT NULL,
    service_type TEXT NOT NULL,
    service_subtype TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    details TEXT,
    status TEXT DEFAULT 'pending',
    estimated_price TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT DEFAULT 'website',
    lead_type TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    budget_range TEXT,
    project_description TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(service_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status) WHERE is_deleted = FALSE;

-- Seed: Initial products
INSERT INTO products (slug, name_en, name_bn, price, original_price, category, badge, stock_quantity, is_active, is_featured, sort_order)
VALUES
    ('phone-case-premium', 'Premium Phone Case', 'প্রিমিয়াম ফোন কেস', 299, 500, 'accessories', 'HOT', 50, true, true, 1),
    ('fast-charger-65w', 'Fast Charger 65W', 'ফাস্ট চার্জার ৬৫W', 599, 800, 'accessories', 'SALE', 30, true, true, 2),
    ('earbuds-tws-pro', 'Earbuds TWS Pro', 'ওয়্যারলেস ইয়ারবাড প্রো', 999, 1500, 'gadgets', 'NEW', 20, true, true, 3),
    ('power-bank-20000', 'Power Bank 20000mAh', 'পাওয়ার ব্যাংক ২০০০০mAh', 1299, null, 'gadgets', null, 15, true, true, 4),
    ('glass-protector', 'Tempered Glass Protector', 'টেম্পার্ড গ্লাস প্রটেক্টর', 250, null, 'accessories', null, 100, true, true, 5),
    ('type-c-cable-3m', 'Type-C Cable 3M Braided', 'টাইপ-সি ব্রেডেড ক্যাবল ৩M', 199, null, 'accessories', null, 200, true, false, 6),
    ('car-holder-magnetic', 'Magnetic Car Holder', 'ম্যাগনেটিক কার হোল্ডার', 399, null, 'accessories', null, 40, true, false, 7),
    ('bt-speaker-waterproof', 'Waterproof BT Speaker', 'ওয়াটারপ্রুফ স্পিকার', 1499, 2000, 'gadgets', null, 10, true, false, 8)
ON CONFLICT (slug) DO NOTHING;
