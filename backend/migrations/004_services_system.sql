-- ABO Enterprise — Services System
-- Migration: 004_services_system.sql
-- Created: 2026-06-26

-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    short_description_en TEXT,
    short_description_bn TEXT,
    long_description_en TEXT,
    long_description_bn TEXT,
    category TEXT NOT NULL,
    icon_url TEXT,
    featured_image_url TEXT,
    icon_color TEXT,
    pricing_type TEXT NOT NULL,
    base_price NUMERIC(10,2),
    min_price NUMERIC(10,2),
    max_price NUMERIC(10,2),
    hourly_rate NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    lead_priority INTEGER DEFAULT 5,
    lead_qualification_score INTEGER DEFAULT 0,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create service pricing tiers table
CREATE TABLE IF NOT EXISTS service_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    price NUMERIC(10,2) NOT NULL,
    duration_days INTEGER,
    features JSONB DEFAULT '[]',
    includes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create service features table
CREATE TABLE IF NOT EXISTS service_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_description TEXT,
    is_included BOOLEAN DEFAULT TRUE,
    pricing_tier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create service booking forms table
CREATE TABLE IF NOT EXISTS service_booking_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    field_label_en TEXT NOT NULL,
    field_label_bn TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    placeholder TEXT,
    options JSONB,
    sort_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create service availability table
CREATE TABLE IF NOT EXISTS service_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    available_from_date DATE,
    available_to_date DATE,
    days_available JSONB,
    time_slots JSONB,
    max_bookings_per_day INTEGER DEFAULT 10,
    blackout_dates JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(is_featured) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_services_lead_priority ON services(lead_priority) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_service ON service_pricing_tiers(service_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_booking_forms_service ON service_booking_forms(service_id) WHERE is_deleted = FALSE;

-- Seed initial services (12 services)
INSERT INTO services (slug, name_en, name_bn, category, pricing_type, is_featured, sort_order, lead_priority) VALUES
    ('printing-service', 'Printing Service', 'প্রিন্টিং সেবা', 'printing', 'fixed', true, 1, 10),
    ('website-development', 'Website Development', 'ওয়েবসাইট ডেভেলপমেন্ট', 'web', 'package', true, 2, 2),
    ('mobile-app-development', 'Mobile App Development', 'মোবাইল অ্যাপ ডেভেলপমেন্ট', 'software', 'custom_quote', true, 3, 1),
    ('digital-marketing', 'Digital Marketing', 'ডিজিটাল মার্কেটিং', 'marketing', 'package', true, 4, 7),
    ('branding-design', 'Branding & Design', 'ব্র্যান্ডিং ও ডিজাইন', 'design', 'package', true, 5, 8),
    ('business-consultation', 'Business Consultation', 'ব্যবসায়িক পরামর্শ', 'consulting', 'hourly', true, 6, 5),
    ('custom-software', 'Custom Software Development', 'কাস্টম সফটওয়্যার ডেভেলপমেন্ট', 'software', 'custom_quote', true, 7, 1),
    ('ai-solutions', 'AI Solutions', 'কৃত্রিম বুদ্ধিমত্তা সমাধান', 'ai', 'custom_quote', true, 8, 1),
    ('python-automation', 'Python Automation', 'পাইথন অটোমেশন', 'automation', 'custom_quote', false, 9, 1),
    ('legal-services', 'Legal Case Writing', 'আইনি কেস লেখা', 'legal', 'fixed', false, 10, 9),
    ('nid-passport', 'NID/Passport Services', 'এনআইডি/পাসপোর্ট সেবা', 'documents', 'fixed', false, 11, 11),
    ('future-service', 'Future Services', 'ভবিষ্যত সেবা', 'other', 'custom_quote', false, 12, 12)
ON CONFLICT (slug) DO NOTHING;
