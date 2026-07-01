-- ABO Enterprise — safe placeholder label upgrade (run after 013 + 014)
-- Migration: 015_upgrade_placeholder_labels.sql
--
-- Purpose: If you already ran 013 then 014, banner settings still have generic
-- labels from 013 (e.g. "About Banner"). This migration upgrades ONLY exact
-- 013 placehold.co URLs to contextual labels — never overwrites:
--   • Cloudinary / custom admin uploads
--   • URLs already upgraded to contextual text
--   • Any non-placehold.co value
--
-- Idempotent: safe to re-run; each UPDATE matches one exact old URL.

-- ── Settings: generic 013 banners → contextual labels ──────────────────────

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=ABO%20Enterprise%20Sylhet'
WHERE key = 'hero_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Hero%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=ABO%20Office%20Sylhet'
WHERE key = 'gallery_office_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Office%20Gallery' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=About%20ABO%20Enterprise'
WHERE key = 'banner_about_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=About%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Mobile%20Accessories%20Shop'
WHERE key = 'banner_products_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Products%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Professional%20Services'
WHERE key = 'banner_services_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Services%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Tech%20Tips%20and%20News'
WHERE key = 'banner_blog_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Blog%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Project%20Gallery'
WHERE key = 'banner_gallery_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Gallery%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Join%20Our%20Team'
WHERE key = 'banner_career_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Career%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Customer%20Reviews'
WHERE key = 'banner_testimonials_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Testimonials%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Contact%20ABO%20Sylhet'
WHERE key = 'banner_contact_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Contact%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Help%20Center%20FAQ'
WHERE key = 'banner_faq_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Faq%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Delivery%20Information'
WHERE key = 'banner_shipping_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Shipping%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Custom%20Software%20Projects'
WHERE key = 'banner_projects_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Projects%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Track%20Your%20Order'
WHERE key = 'banner_track_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Track%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Book%20a%20Service'
WHERE key = 'banner_book_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Book%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Compare%20Products'
WHERE key = 'banner_compare_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Compare%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Legal%20Assistance'
WHERE key = 'banner_legal_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Legal%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Software%20and%20AI'
WHERE key = 'banner_software_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Software%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Shopping%20Cart'
WHERE key = 'banner_cart_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Cart%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Secure%20Checkout'
WHERE key = 'banner_checkout_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Checkout%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Search%20Products'
WHERE key = 'banner_search_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Search%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=My%20Orders'
WHERE key = 'banner_orders_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Orders%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Privacy%20Policy'
WHERE key = 'banner_privacy_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Privacy%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Terms%20of%20Service'
WHERE key = 'banner_terms_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Terms%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Refund%20Policy'
WHERE key = 'banner_refund_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Refund%20Banner' AND is_deleted = false;

UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=My%20Profile'
WHERE key = 'banner_profile_image_url' AND value = 'https://placehold.co/1920x1080/webp?text=Profile%20Banner' AND is_deleted = false;

-- ── Settings: ensure 014-only keys exist (no overwrite if present) ───────────
-- Copied from 014; ON CONFLICT + empty-only UPDATE keeps this safe.

INSERT INTO settings (key, value, data_type, description, is_editable) VALUES ('about_story_image_url', 'https://placehold.co/1920x1080/webp?text=Our%20Story%20Sylhet', 'string', 'About page story section image (1920×1080)', true) ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = 'https://placehold.co/1920x1080/webp?text=Our%20Story%20Sylhet', description = 'About page story section image (1920×1080)' WHERE key = 'about_story_image_url' AND (value IS NULL OR trim(value) = '') AND is_deleted = false;

INSERT INTO settings (key, value, data_type, description, is_editable) VALUES ('about_team_json', '[{"id": "founding-team", "name": "Ahmed Brothers", "role": {"en": "Founding Team", "bn": "প্রতিষ্ঠাতা দল"}, "desc": {"en": "Leading products, services & software strategy.", "bn": "পণ্য, সেবা ও সফটওয়্যার কৌশল পরিচালনা।"}, "image": "https://placehold.co/256x256/webp?text=Ahmed%20Brothers"}, {"id": "tech-team", "name": "Tech Team", "role": {"en": "Software Engineers", "bn": "সফটওয়্যার ইঞ্জিনিয়ার"}, "desc": {"en": "Web, mobile, AI & automation specialists.", "bn": "ওয়েব, মোবাইল, AI ও অটোমেশন বিশেষজ্ঞ।"}, "image": "https://placehold.co/256x256/webp?text=Tech%20Team"}, {"id": "support-team", "name": "Support Team", "role": {"en": "Customer Success", "bn": "গ্রাহক সেবা"}, "desc": {"en": "24/7 support via WhatsApp, phone & AI assistant.", "bn": "WhatsApp, ফোন ও AI সহকারীতে ২৪/৭ সেবা।"}, "image": "https://placehold.co/256x256/webp?text=Support%20Team"}]', 'json', 'About page team', true) ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = '[{"id": "founding-team", "name": "Ahmed Brothers", "role": {"en": "Founding Team", "bn": "প্রতিষ্ঠাতা দল"}, "desc": {"en": "Leading products, services & software strategy.", "bn": "পণ্য, সেবা ও সফটওয়্যার কৌশল পরিচালনা।"}, "image": "https://placehold.co/256x256/webp?text=Ahmed%20Brothers"}, {"id": "tech-team", "name": "Tech Team", "role": {"en": "Software Engineers", "bn": "সফটওয়্যার ইঞ্জিনিয়ার"}, "desc": {"en": "Web, mobile, AI & automation specialists.", "bn": "ওয়েব, মোবাইল, AI ও অটোমেশন বিশেষজ্ঞ।"}, "image": "https://placehold.co/256x256/webp?text=Tech%20Team"}, {"id": "support-team", "name": "Support Team", "role": {"en": "Customer Success", "bn": "গ্রাহক সেবা"}, "desc": {"en": "24/7 support via WhatsApp, phone & AI assistant.", "bn": "WhatsApp, ফোন ও AI সহকারীতে ২৪/৭ সেবা।"}, "image": "https://placehold.co/256x256/webp?text=Support%20Team"}]', description = 'About page team' WHERE key = 'about_team_json' AND (value IS NULL OR trim(value) = '') AND is_deleted = false;

INSERT INTO settings (key, value, data_type, description, is_editable) VALUES ('client_logos_json', '[{"name": "Retail POS", "abbr": "RP", "image": "https://placehold.co/256x256/webp?text=Retail%20POS"}, {"name": "Restaurant Pro", "abbr": "REST", "image": "https://placehold.co/256x256/webp?text=Restaurant%20Pro"}, {"name": "School ERP", "abbr": "ERP", "image": "https://placehold.co/256x256/webp?text=School%20ERP"}, {"name": "Hospital MS", "abbr": "HMS", "image": "https://placehold.co/256x256/webp?text=Hospital%20MS"}, {"name": "ISP Billing", "abbr": "ISP", "image": "https://placehold.co/256x256/webp?text=ISP%20Billing"}, {"name": "E-Commerce", "abbr": "ECOM", "image": "https://placehold.co/256x256/webp?text=E-Commerce"}]', 'json', 'Client logos strip', true) ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = '[{"name": "Retail POS", "abbr": "RP", "image": "https://placehold.co/256x256/webp?text=Retail%20POS"}, {"name": "Restaurant Pro", "abbr": "REST", "image": "https://placehold.co/256x256/webp?text=Restaurant%20Pro"}, {"name": "School ERP", "abbr": "ERP", "image": "https://placehold.co/256x256/webp?text=School%20ERP"}, {"name": "Hospital MS", "abbr": "HMS", "image": "https://placehold.co/256x256/webp?text=Hospital%20MS"}, {"name": "ISP Billing", "abbr": "ISP", "image": "https://placehold.co/256x256/webp?text=ISP%20Billing"}, {"name": "E-Commerce", "abbr": "ECOM", "image": "https://placehold.co/256x256/webp?text=E-Commerce"}]', description = 'Client logos strip' WHERE key = 'client_logos_json' AND (value IS NULL OR trim(value) = '') AND is_deleted = false;

INSERT INTO settings (key, value, data_type, description, is_editable) VALUES ('demo_reviews_json', '[{"id": "demo-1", "customer_name": "Rahim Uddin", "company": "Shop Owner, Sylhet", "rating": 5, "review_en": "ABO built our POS in 2 weeks. Billing errors dropped to zero!", "review_bn": "ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!", "source": "Google", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Rahim%20Uddin"}, {"id": "demo-2", "customer_name": "Fatema Begum", "company": "Restaurant Owner", "rating": 5, "review_en": "Restaurant software transformed our kitchen operations.", "review_bn": "রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।", "source": "Facebook", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Fatema%20Begum"}, {"id": "demo-3", "customer_name": "Karim Hassan", "company": "IT Manager", "rating": 5, "review_en": "Custom ERP delivered on time with AI features.", "review_bn": "AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।", "source": "Direct", "is_verified": false, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Karim%20Hassan"}, {"id": "demo-4", "customer_name": "Nusrat Jahan", "company": "Freelancer", "rating": 5, "review_en": "Top quality accessories, same-day delivery!", "review_bn": "সেরা মান, একই দিনে ডেলিভারি!", "source": "Google", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Nusrat%20Jahan"}]', 'json', 'Offline demo reviews', true) ON CONFLICT (key) DO NOTHING;
UPDATE settings SET value = '[{"id": "demo-1", "customer_name": "Rahim Uddin", "company": "Shop Owner, Sylhet", "rating": 5, "review_en": "ABO built our POS in 2 weeks. Billing errors dropped to zero!", "review_bn": "ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!", "source": "Google", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Rahim%20Uddin"}, {"id": "demo-2", "customer_name": "Fatema Begum", "company": "Restaurant Owner", "rating": 5, "review_en": "Restaurant software transformed our kitchen operations.", "review_bn": "রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।", "source": "Facebook", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Fatema%20Begum"}, {"id": "demo-3", "customer_name": "Karim Hassan", "company": "IT Manager", "rating": 5, "review_en": "Custom ERP delivered on time with AI features.", "review_bn": "AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।", "source": "Direct", "is_verified": false, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Karim%20Hassan"}, {"id": "demo-4", "customer_name": "Nusrat Jahan", "company": "Freelancer", "rating": 5, "review_en": "Top quality accessories, same-day delivery!", "review_bn": "সেরা মান, একই দিনে ডেলিভারি!", "source": "Google", "is_verified": true, "is_featured": true, "photo_url": "https://placehold.co/256x256/webp?text=Nusrat%20Jahan"}]', description = 'Offline demo reviews' WHERE key = 'demo_reviews_json' AND (value IS NULL OR trim(value) = '') AND is_deleted = false;

-- ── Entity backfill: only empty fields or exact 013 generic blog URL ─────────

UPDATE reviews SET photo_url = 'https://placehold.co/256x256/webp?text=Rahim%20Uddin' WHERE customer_name = 'Rahim Uddin' AND (photo_url IS NULL OR photo_url = '');
UPDATE reviews SET photo_url = 'https://placehold.co/256x256/webp?text=Fatema%20Begum' WHERE customer_name = 'Fatema Begum' AND (photo_url IS NULL OR photo_url = '');
UPDATE reviews SET photo_url = 'https://placehold.co/256x256/webp?text=Karim%20Hassan' WHERE customer_name = 'Karim Hassan' AND (photo_url IS NULL OR photo_url = '');
UPDATE reviews SET photo_url = 'https://placehold.co/256x256/webp?text=Nusrat%20Jahan' WHERE customer_name = 'Nusrat Jahan' AND (photo_url IS NULL OR photo_url = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
  ) THEN
    UPDATE blog_posts
    SET featured_image_url = 'https://placehold.co/1920x1080/webp?text=Welcome%20to%20ABO',
        og_image = 'https://placehold.co/1200x630/webp?text=Welcome%20to%20ABO%20OG'
    WHERE slug = 'welcome-abo-enterprise'
      AND featured_image_url = 'https://placehold.co/1920x1080/webp?text=Welcome%20Blog';

    UPDATE blog_posts
    SET featured_image_url = 'https://placehold.co/1920x1080/webp?text=Accessories%20Guide',
        og_image = 'https://placehold.co/1200x630/webp?text=Accessories%20Guide%20OG'
    WHERE slug = 'mobile-accessories-guide'
      AND (featured_image_url IS NULL OR featured_image_url = '');
  END IF;
END $$;
