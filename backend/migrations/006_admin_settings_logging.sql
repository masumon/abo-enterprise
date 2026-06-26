-- ABO Enterprise — Admin Settings & Activity Logging
-- Migration: 006_admin_settings_logging.sql
-- Created: 2026-06-26

-- Create admin_settings table (replaces old settings)
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    is_secret BOOLEAN DEFAULT FALSE,
    display_type TEXT,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create activity logs table (audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admin_users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT UNIQUE NOT NULL,
    subject_en TEXT NOT NULL,
    subject_bn TEXT NOT NULL,
    body_en TEXT NOT NULL,
    body_bn TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lead form fields table
CREATE TABLE IF NOT EXISTS lead_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_source TEXT NOT NULL,
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
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(key) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON admin_settings(category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_lead_form_fields_source ON lead_form_fields(lead_source) WHERE is_deleted = FALSE;

-- Seed admin settings
INSERT INTO admin_settings (category, key, value, data_type, description_en, description_bn, is_editable, display_type, sort_order) VALUES
    -- Business settings
    ('business', 'business_name', 'ABO Enterprise', 'string', 'Business Name', 'ব্যবসায়ের নাম', true, 'text', 1),
    ('business', 'business_phone', '+880182500797', 'string', 'Business Phone', 'ব্যবসায়ের ফোন', true, 'text', 2),
    ('business', 'business_email', 'abo.enterprise@gmail.com', 'string', 'Business Email', 'ব্যবসায়ের ইমেল', true, 'text', 3),
    ('business', 'business_address', 'Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh', 'string', 'Business Address', 'ব্যবসায়ের ঠিকানা', true, 'textarea', 4),
    ('business', 'business_logo_url', '', 'string', 'Logo URL', 'লোগো ইউআরএল', true, 'text', 5),

    -- Payment settings
    ('payment', 'bkash_account', '', 'string', 'bKash Account Number', 'বিকাশ অ্যাকাউন্ট নম্বর', true, 'text', 1),
    ('payment', 'nagad_account', '', 'string', 'Nagad Account Number', 'নগদ অ্যাকাউন্ট নম্বর', true, 'text', 2),
    ('payment', 'payment_commission_percentage', '2.5', 'number', 'Payment Commission %', 'পেমেন্ট কমিশন %', true, 'number', 3),
    ('payment', 'payment_min_amount', '100', 'number', 'Min Payment Amount', 'ন্যূনতম পেমেন্ট পরিমাণ', true, 'number', 4),

    -- Email settings
    ('email', 'smtp_host', 'smtp.gmail.com', 'string', 'SMTP Host', 'এসএমটিপি হোস্ট', false, 'text', 1),
    ('email', 'smtp_port', '587', 'string', 'SMTP Port', 'এসএমটিপি পোর্ট', false, 'text', 2),
    ('email', 'email_from_address', 'noreply@aboenterprise.com', 'string', 'From Email Address', 'প্রেরক ইমেল ঠিকানা', true, 'text', 3),
    ('email', 'email_sender_name', 'ABO Enterprise', 'string', 'Email Sender Name', 'ইমেল প্রেরক নাম', true, 'text', 4),

    -- Notification settings
    ('notification', 'admin_notify_email', 'admin@aboenterprise.com', 'string', 'Admin Notification Email', 'প্রশাসক বিজ্ঞপ্তি ইমেল', true, 'text', 1),
    ('notification', 'send_booking_confirmation', 'true', 'boolean', 'Send Booking Confirmation', 'বুকিং নিশ্চিতকরণ পাঠান', true, 'checkbox', 2),
    ('notification', 'send_lead_notification', 'true', 'boolean', 'Send Lead Notification', 'লিড বিজ্ঞপ্তি পাঠান', true, 'checkbox', 3),
    ('notification', 'send_payment_alerts', 'true', 'boolean', 'Send Payment Alerts', 'পেমেন্ট সতর্কতা পাঠান', true, 'checkbox', 4)
ON CONFLICT (key) DO NOTHING;

-- Seed email templates
INSERT INTO email_templates (template_name, subject_en, subject_bn, body_en, body_bn, variables) VALUES
    ('booking_confirmation', 'Booking Confirmation - {{booking_number}}', 'বুকিং নিশ্চিতকরণ - {{booking_number}}',
     'Dear {{customer_name}},\n\nYour booking has been received.\n\nBooking #: {{booking_number}}\nService: {{service_name}}\nDate: {{booking_date}}\n\nWe will contact you soon.\n\nThank you!',
     'প্রিয় {{customer_name}},\n\nআপনার বুকিং গ্রহণ করা হয়েছে।\n\nবুকিং #: {{booking_number}}\nসেবা: {{service_name}}\nতারিখ: {{booking_date}}\n\nআমরা শীঘ্রই যোগাযোগ করব।\n\nধন্যবাদ!',
     '["booking_number", "customer_name", "service_name", "booking_date"]'),

    ('booking_confirmed', 'Your Booking is Confirmed - {{booking_number}}', 'আপনার বুকিং নিশ্চিত হয়েছে - {{booking_number}}',
     'Dear {{customer_name}},\n\nYour booking has been confirmed.\n\nBooking #: {{booking_number}}\nService: {{service_name}}\nScheduled Date: {{scheduled_date}}\n\nEstimated Cost: {{estimated_price}}\n\nThank you for choosing us!',
     'প্রিয় {{customer_name}},\n\nআপনার বুকিং নিশ্চিত হয়েছে।\n\nবুকিং #: {{booking_number}}\nসেবা: {{service_name}}\nনির্ধারিত তারিখ: {{scheduled_date}}\n\nআনুমানিক খরচ: {{estimated_price}}\n\nআমাদের বেছে নেওয়ার জন্য ধন্যবাদ!',
     '["booking_number", "customer_name", "service_name", "scheduled_date", "estimated_price"]'),

    ('invoice_generated', 'Your Invoice - {{invoice_number}}', 'আপনার চালান - {{invoice_number}}',
     'Dear {{customer_name}},\n\nYour invoice has been generated.\n\nInvoice #: {{invoice_number}}\nAmount: {{amount}}\nDate: {{issue_date}}\n\nPlease see attached PDF.\n\nThank you!',
     'প্রিয় {{customer_name}},\n\nআপনার চালান তৈরি হয়েছে।\n\nচালান #: {{invoice_number}}\nপরিমাণ: {{amount}}\nতারিখ: {{issue_date}}\n\nসংযুক্ত পিডিএফ দেখুন।\n\nধন্যবাদ!',
     '["invoice_number", "customer_name", "amount", "issue_date"]'),

    ('payment_received', 'Payment Received - {{order_id}}', 'পেমেন্ট গৃহীত হয়েছে - {{order_id}}',
     'Dear {{customer_name}},\n\nYour payment has been received successfully.\n\nAmount: {{amount}}\nMethod: {{payment_method}}\nDate: {{payment_date}}\n\nThank you!',
     'প্রিয় {{customer_name}},\n\nআপনার পেমেন্ট সফলভাবে গৃহীত হয়েছে।\n\nপরিমাণ: {{amount}}\nপদ্ধতি: {{payment_method}}\nতারিখ: {{payment_date}}\n\nধন্যবাদ!',
     '["customer_name", "amount", "payment_method", "payment_date", "order_id"]'),

    ('order_confirmation', 'Order Confirmation - {{order_number}}', 'অর্ডার নিশ্চিতকরণ - {{order_number}}',
     'Dear {{customer_name}},\n\nYour order has been confirmed.\n\nOrder #: {{order_number}}\nTotal: {{total_amount}}\nEstimated Delivery: {{estimated_delivery}}\n\nThank you for your order!',
     'প্রিয় {{customer_name}},\n\nআপনার অর্ডার নিশ্চিত হয়েছে।\n\nঅর্ডার #: {{order_number}}\nমোট: {{total_amount}}\nআনুমানিক ডেলিভারি: {{estimated_delivery}}\n\nআপনার অর্ডারের জন্য ধন্যবাদ!',
     '["customer_name", "order_number", "total_amount", "estimated_delivery"]')
ON CONFLICT (template_name) DO NOTHING;

-- Seed lead form fields
INSERT INTO lead_form_fields (lead_source, field_name, field_type, field_label_en, field_label_bn, is_required, placeholder, sort_order) VALUES
    ('general', 'name', 'text', 'Full Name', 'সম্পূর্ণ নাম', true, 'Enter your full name', 1),
    ('general', 'email', 'email', 'Email Address', 'ইমেল ঠিকানা', true, 'your@email.com', 2),
    ('general', 'phone', 'phone', 'Phone Number', 'ফোন নম্বর', true, '+880XXXXXXXXXX', 3),
    ('general', 'company', 'text', 'Company Name', 'কোম্পানির নাম', false, 'Your company name', 4),
    ('general', 'job_title', 'text', 'Job Title', 'চাকরির শিরোনাম', false, 'Your position', 5),
    ('general', 'company_size', 'select', 'Company Size', 'কোম্পানির আকার', false, null, 6),
    ('general', 'project_description', 'textarea', 'Project Description', 'প্রকল্প বর্ণনা', true, 'Describe your project...', 7),
    ('general', 'budget_range', 'select', 'Budget Range', 'বাজেট পরিসীমা', false, null, 8),
    ('general', 'timeline', 'select', 'Project Timeline', 'প্রকল্প সময়সীমা', false, null, 9),
    ('general', 'requirements', 'textarea', 'Detailed Requirements', 'বিস্তারিত প্রয়োজনীয়তা', false, 'Any specific requirements?', 10)
ON CONFLICT DO NOTHING;
