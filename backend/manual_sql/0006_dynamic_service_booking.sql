-- ============================================================================
-- ABO Enterprise — Dynamic Service Booking (JSONB answers + CTA + taxonomy seed)
-- Manual mirror of Alembic migration 0006_dynamic_service_booking.py
--
-- নিরাপদ / SAFE: পুরোটা additive। কোনো পুরনো টেবিল/কলাম/ডেটা মুছে না।
-- বারবার চালালেও সমস্যা নেই (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- একবারে পুরো ব্লকটা Supabase SQL Editor-এ পেস্ট করে Run করুন।
--
-- NOTE: ডিপ্লয়ের সময় `alembic upgrade head` নিজেই এটা চালায়। তাই ম্যানুয়াল রান
-- ঐচ্ছিক — আগে চালালেও deploy-এ আবার নিরাপদে স্কিপ/রি-রান হবে।
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. bookings_v2.form_data — ডাইনামিক বুকিং ফর্মের উত্তর (JSONB)
-- ---------------------------------------------------------------------------
ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. services CTA override — NULL মানে আগের মতোই auto-infer
--    cta_type: 'book' | 'order' | 'quote' | 'contact'
-- ---------------------------------------------------------------------------
ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_type VARCHAR(20);
ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_label_en VARCHAR(120);
ALTER TABLE services ADD COLUMN IF NOT EXISTS cta_label_bn VARCHAR(120);

-- ---------------------------------------------------------------------------
-- 3. Service taxonomy seed — ৯টি মূল ক্যাটাগরি + সাব-ক্যাটাগরি
--    (আগে থেকে থাকলে স্কিপ হবে; কিছুই ওভাররাইট হয় না)
-- ---------------------------------------------------------------------------
INSERT INTO categories (slug, name_en, name_bn, icon, applies_to, sort_order, is_active) VALUES
    ('digital-e-services',      'Digital & E-Services',     'ডিজিটাল ও ই-সেবা',        'FileText',   '["service"]'::jsonb, 1, TRUE),
    ('printing-documentation',  'Printing & Documentation', 'প্রিন্টিং ও ডকুমেন্টেশন', 'Printer',    '["service"]'::jsonb, 2, TRUE),
    ('web-software',            'Web & Software',           'ওয়েব ও সফটওয়্যার',        'Globe',      '["service"]'::jsonb, 3, TRUE),
    ('mobile-lab',              'Mobile Lab',               'মোবাইল ল্যাব',             'Smartphone', '["service"]'::jsonb, 4, TRUE),
    ('it-support',              'IT Support',               'আইটি সাপোর্ট',             'Headphones', '["service"]'::jsonb, 5, TRUE),
    ('marketing-design',        'Marketing & Design',       'মার্কেটিং ও ডিজাইন',       'Megaphone',  '["service"]'::jsonb, 6, TRUE),
    ('business-consultancy',    'Business Consultancy',     'বিজনেস কনসালটেন্সি',       'Briefcase',  '["service"]'::jsonb, 7, TRUE),
    ('ai-automation',           'AI & Automation',          'এআই ও অটোমেশন',            'Bot',        '["service"]'::jsonb, 8, TRUE),
    ('others',                  'Others',                   'অন্যান্য',                 'Cog',        '["service"]'::jsonb, 9, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subcategories (category_id, slug, name_en, name_bn, sort_order, is_active)
SELECT c.id, s.slug, s.name_en, s.name_bn, s.sort_order, TRUE
FROM (VALUES
    -- ডিজিটাল ও ই-সেবা
    ('digital-e-services', 'passport',                  'Passport',                   'পাসপোর্ট',                  1),
    ('digital-e-services', 'nid',                       'NID',                        'NID',                       2),
    ('digital-e-services', 'birth-death-registration',  'Birth/Death Registration',   'জন্ম/মৃত্যু নিবন্ধন',       3),
    ('digital-e-services', 'travel-visa',               'Travel & Visa',              'ট্রাভেল ও ভিসা',            4),
    ('digital-e-services', 'online-application',        'Online Application',         'অনলাইন আবেদন',              5),
    ('digital-e-services', 'payment-recharge',          'Payment/Recharge',           'পেমেন্ট/রিচার্জ',           6),
    -- প্রিন্টিং ও ডকুমেন্টেশন
    ('printing-documentation', 'printing-photocopy',    'Printing/Photocopy',         'প্রিন্টিং/ফটোকপি',          1),
    ('printing-documentation', 'plastic-id-card',       'Plastic ID Card',            'প্লাস্টিক আইডি কার্ড',      2),
    ('printing-documentation', 'scanning-lamination',   'Scanning/Lamination',        'স্ক্যানিং/ল্যামিনেশন',      3),
    ('printing-documentation', 'cv-writing',            'CV Writing',                 'সিভি তৈরি',                 4),
    ('printing-documentation', 'legal-drafting',        'Legal Drafting',             'লিগ্যাল ড্রাফটিং',          5),
    -- ওয়েব ও সফটওয়্যার
    ('web-software', 'website-design',                  'Website Design',             'ওয়েবসাইট ডিজাইন',           1),
    ('web-software', 'custom-software',                 'Custom Software',            'কাস্টম সফটওয়্যার',          2),
    ('web-software', 'sports-tracking-app',             'Sports Tracking App',        'স্পোর্টস ট্র্যাকিং অ্যাপ',  3),
    ('web-software', 'web-maintenance',                 'Web Maintenance',            'ওয়েব মেইনটেন্যান্স',        4),
    -- মোবাইল ল্যাব
    ('mobile-lab', 'software-unlock',                   'Software Unlock',            'সফটওয়্যার আনলক',            1),
    ('mobile-lab', 'flashing-repair',                   'Flashing/Repair',            'ফ্ল্যাশিং/রিপেয়ার',         2),
    ('mobile-lab', 'data-recovery',                     'Data Recovery',              'ডেটা রিকভারি',              3),
    ('mobile-lab', 'app-development',                   'App Development',            'অ্যাপ ডেভেলপমেন্ট',         4),
    ('mobile-lab', 'parts-sales',                       'Parts Sales',                'পার্টস সেলস',               5),
    -- আইটি সাপোর্ট
    ('it-support', 'os-installation',                   'OS Installation',            'ওএস ইন্সটলেশন',             1),
    ('it-support', 'pc-optimization',                   'PC Optimization',            'পিসি অপটিমাইজেশন',          2),
    ('it-support', 'networking',                        'Networking',                 'নেটওয়ার্কিং',               3),
    ('it-support', 'cctv',                              'CCTV',                       'সিসিটিভি',                  4),
    ('it-support', 'hardware-servicing',                'Hardware Servicing',         'হার্ডওয়্যার সার্ভিসিং',     5),
    ('it-support', 'corporate-amc',                     'Corporate AMC',              'কর্পোরেট AMC',              6),
    -- মার্কেটিং ও ডিজাইন
    ('marketing-design', 'logo-branding',               'Logo & Branding',            'লোগো ব্র্যান্ডিং',          1),
    ('marketing-design', 'social-media-campaign',       'Social Media Campaign',      'সোশ্যাল মিডিয়া ক্যাম্পেইন', 2),
    ('marketing-design', 'graphic-design',              'Graphic Design',             'গ্রাফিক ডিজাইন',            3),
    ('marketing-design', 'seo',                         'SEO',                        'এসইও (SEO)',                4),
    -- বিজনেস কনসালটেন্সি
    ('business-consultancy', 'showroom-interior-planning', 'Showroom Interior Planning', 'শোরুম ইন্টেরিয়র প্ল্যানিং', 1),
    ('business-consultancy', 'wholesale-sourcing',      'Wholesale Sourcing',         'হোলসেল সোর্সিং',            2),
    ('business-consultancy', 'pos-erp-solution',        'POS/ERP Solution',           'POS/ERP সল্যুশন',           3),
    ('business-consultancy', 'isp-iptv-server',         'ISP/IPTV Server',            'ISP/IPTV সার্ভার',          4),
    -- এআই ও অটোমেশন
    ('ai-automation', 'python-automation',              'Python Automation',          'পাইথন অটোমেশন',             1),
    ('ai-automation', 'chatbot',                        'Chatbot',                    'চ্যাটবট',                   2),
    ('ai-automation', 'business-ai-tools',              'Business AI Tools',          'বিজনেস এআই টুলস',           3),
    -- অন্যান্য
    ('others', 'future-services',                       'Future Services',            'ভবিষ্যৎ সেবা',              1)
) AS s(category_slug, slug, name_en, name_bn, sort_order)
JOIN categories c ON c.slug = s.category_slug
ON CONFLICT (category_id, slug) DO NOTHING;

COMMIT;
