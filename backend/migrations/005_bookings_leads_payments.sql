-- ABO Enterprise — Bookings v2, Leads v2, Payments
-- Migration: 005_bookings_leads_payments.sql
-- Created: 2026-06-26

-- Create bookings_v2 table (replaces old bookings)
CREATE TABLE IF NOT EXISTS bookings_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number TEXT UNIQUE NOT NULL,
    service_id UUID NOT NULL REFERENCES services(id),
    service_name TEXT NOT NULL,
    service_tier TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_company TEXT,
    booking_date DATE,
    estimated_completion_date DATE,
    pricing_type TEXT NOT NULL,
    quoted_price NUMERIC(10,2),
    final_price NUMERIC(10,2),
    hours_worked NUMERIC(5,2),
    details TEXT,
    requirements TEXT,
    attachments JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create leads_v2 table (enhanced)
CREATE TABLE IF NOT EXISTS leads_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_number TEXT UNIQUE NOT NULL,
    service_id UUID REFERENCES services(id),
    lead_type TEXT NOT NULL,
    source TEXT DEFAULT 'website',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    company TEXT,
    job_title TEXT,
    company_size TEXT,
    project_description TEXT,
    requirements TEXT,
    budget_range TEXT,
    budget_min NUMERIC(10,2),
    budget_max NUMERIC(10,2),
    timeline TEXT,
    attachments JSONB DEFAULT '[]',
    qualification_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    reason_lost TEXT,
    assigned_to UUID REFERENCES admin_users(id),
    next_action TEXT,
    next_action_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id),
    booking_id UUID REFERENCES bookings_v2(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    items JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_gateway TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    account_identifier TEXT,
    commission_percentage NUMERIC(5,2) DEFAULT 0,
    min_amount NUMERIC(10,2),
    max_amount NUMERIC(10,2),
    description TEXT,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create revenue transactions table
CREATE TABLE IF NOT EXISTS revenue_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL,
    order_id UUID REFERENCES orders(id),
    booking_id UUID REFERENCES bookings_v2(id),
    lead_id UUID REFERENCES leads_v2(id),
    customer_name TEXT,
    customer_email TEXT,
    service_name TEXT,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    transaction_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create customer interactions table (CRM)
CREATE TABLE IF NOT EXISTS customer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    interaction_type TEXT NOT NULL,
    message TEXT,
    source TEXT,
    interaction_date TIMESTAMPTZ,
    created_by UUID REFERENCES admin_users(id),
    next_followup_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for bookings_v2
CREATE INDEX IF NOT EXISTS idx_bookings_v2_service ON bookings_v2(service_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_v2_status ON bookings_v2(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_v2_customer ON bookings_v2(customer_email) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_v2_created ON bookings_v2(created_at) WHERE is_deleted = FALSE;

-- Create indexes for leads_v2
CREATE INDEX IF NOT EXISTS idx_leads_v2_service ON leads_v2(service_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_v2_status ON leads_v2(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_v2_score ON leads_v2(qualification_score) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_v2_assigned ON leads_v2(assigned_to) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_leads_v2_created ON leads_v2(created_at) WHERE is_deleted = FALSE;

-- Create indexes for other tables
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_revenue_order ON revenue_transactions(order_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_revenue_booking ON revenue_transactions(booking_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_interactions_email ON customer_interactions(customer_email) WHERE is_deleted = FALSE;

-- Seed payment methods
INSERT INTO payment_methods (payment_gateway, is_active, description, sort_order) VALUES
    ('bkash', true, 'bKash Mobile Payment', 1),
    ('nagad', true, 'Nagad Mobile Payment', 2),
    ('bank_transfer', true, 'Bank Transfer', 3),
    ('cash_on_delivery', true, 'Cash on Delivery', 4)
ON CONFLICT DO NOTHING;
