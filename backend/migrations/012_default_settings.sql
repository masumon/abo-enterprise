-- Default CMS settings (idempotent)
INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES
    ('google_maps_embed', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d28915.5!2d91.8687!3d24.8949!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375029b0c9e5f0a5%3A0x8dfd1bd2e54e9c5!2sSylhet%2C%20Bangladesh!5e0!3m2!1sen!2sbd!4v1719590400000!5m2!1sen!2sbd', 'string', 'Google Maps embed URL for contact page', true),
    ('contact_address', 'Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh', 'string', 'Business address', true),
    ('contact_phone', '01825007977', 'string', 'Contact phone', true),
    ('contact_email', 'abo.enterprise@gmail.com', 'string', 'Contact email', true)
ON CONFLICT (key) DO NOTHING;
