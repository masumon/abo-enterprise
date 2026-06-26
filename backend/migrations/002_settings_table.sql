-- ABO Enterprise — Settings Table
-- Run this in Supabase SQL Editor

-- Settings table for admin to configure WhatsApp, Email, API keys, etc.
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    data_type TEXT DEFAULT 'string',  -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_secret BOOLEAN DEFAULT FALSE,  -- For sensitive data like API keys
    is_editable BOOLEAN DEFAULT TRUE,  -- Can admin edit this?
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create index for faster lookups
CREATE INDEX idx_settings_key ON settings(key) WHERE is_deleted = FALSE;

-- Insert default settings
INSERT INTO settings (key, value, data_type, description, is_editable) VALUES
    ('business_name', 'ABO Enterprise', 'string', 'Business name displayed everywhere', true),
    ('whatsapp_number', '8801825007977', 'string', 'WhatsApp business number (for notifications and share links)', true),
    ('business_email', 'abo.enterprise@gmail.com', 'string', 'Email for order/booking confirmations', true),
    ('business_phone', '+880182500797', 'string', 'Business contact phone', true),
    ('business_address', 'Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh', 'string', 'Physical store address', true),
    ('email_sender_name', 'ABO Enterprise', 'string', 'Name displayed in emails', true),
    ('order_confirmation_enabled', 'true', 'boolean', 'Send order confirmation emails', true),
    ('booking_confirmation_enabled', 'true', 'boolean', 'Send booking confirmation emails', true),
    ('whatsapp_notifications_enabled', 'true', 'boolean', 'Send WhatsApp notification links', true),
    ('cloudinary_cloud_name', '', 'string', 'Cloudinary cloud name for image uploads', true),
    ('cloudinary_api_key', '', 'string', 'Cloudinary API key', true),
    ('cloudinary_api_secret', '', 'string', 'Cloudinary API secret', true)
ON CONFLICT (key) DO NOTHING;
