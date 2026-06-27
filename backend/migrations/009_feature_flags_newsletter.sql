-- Feature flags and newsletter settings seed
INSERT INTO settings (key, value, data_type, description, is_editable) VALUES
    ('feature_flash_sale', 'true', 'boolean', 'Show flash sale countdown on homepage', true),
    ('feature_coupons', 'true', 'boolean', 'Enable coupon codes at checkout', true),
    ('feature_guest_checkout', 'true', 'boolean', 'Allow guest checkout without account', true),
    ('feature_newsletter', 'true', 'boolean', 'Show newsletter signup in footer', true),
    ('feature_infinite_scroll', 'true', 'boolean', 'Enable infinite scroll on products page', true),
    ('newsletter_subscribers', '[]', 'json', 'Newsletter subscriber emails', false)
ON CONFLICT (key) DO NOTHING;
