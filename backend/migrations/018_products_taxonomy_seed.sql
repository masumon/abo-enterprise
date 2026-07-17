-- 018_products_taxonomy_seed.sql
-- Seeds the full Products taxonomy tree (3 top categories x 10 branches x 3
-- leaves) into the unified nested `categories` table. Requires alembic 0008
-- (categories.parent_id) — deployed automatically with the backend.
-- Idempotent: ON CONFLICT (slug) DO NOTHING; safe to run multiple times.
-- Run manually in the Supabase SQL Editor.
BEGIN;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mobile-accessories','Mobile Accessories','মোবাইল অ্যাক্সেসরিজ','["product"]'::jsonb,0,TRUE,NULL)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('chargers','Chargers','চার্জার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mobile-chargers','Mobile Charger','মোবাইল চার্জার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='chargers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('fast-chargers','Fast Charger','ফাস্ট চার্জার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='chargers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-chargers','Wireless Charger','ওয়্যারলেস চার্জার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='chargers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('cables','Cables','কেবল','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('type-c-cables','Type-C Cable','Type-C কেবল','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='cables'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('lightning-cables','Lightning Cable','Lightning কেবল','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='cables'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('micro-usb-cables','Micro USB Cable','Micro USB কেবল','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='cables'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('power-banks','Power Banks','পাওয়ার ব্যাংক','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mini-power-banks','Mini Power Bank','মিনি পাওয়ার ব্যাংক','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='power-banks'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('fast-charging-power-banks','Fast Charging Power Bank','ফাস্ট চার্জিং পাওয়ার ব্যাংক','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='power-banks'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-power-banks','Wireless Power Bank','ওয়্যারলেস পাওয়ার ব্যাংক','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='power-banks'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('headphones','Headphones','হেডফোন','["product"]'::jsonb,3,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wired-headphones','Wired Headphone','তারযুক্ত হেডফোন','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='headphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-headphones','Wireless Headphone','ওয়্যারলেস হেডফোন','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='headphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-headphones','Gaming Headphone','গেমিং হেডফোন','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='headphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('earphones','Earphones','ইয়ারফোন','["product"]'::jsonb,4,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wired-earphones','Wired Earphone','তারযুক্ত ইয়ারফোন','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='earphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('bluetooth-earphones','Bluetooth Earphone','ব্লুটুথ ইয়ারফোন','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='earphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('neckbands','Neckband','নেকব্যান্ড','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='earphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mobile-covers','Mobile Covers','মোবাইল কভার','["product"]'::jsonb,5,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('silicone-covers','Silicone Cover','সিলিকন কভার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='mobile-covers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('leather-covers','Leather Cover','লেদার কভার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='mobile-covers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('rugged-covers','Rugged Cover','রাগেড কভার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='mobile-covers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('tempered-glass','Tempered Glass','টেম্পার্ড গ্লাস','["product"]'::jsonb,6,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('tempered-glass-25d','2.5D Glass','2.5D গ্লাস','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='tempered-glass'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('tempered-glass-5d','5D Glass','5D গ্লাস','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='tempered-glass'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('privacy-glass','Privacy Glass','প্রাইভেসি গ্লাস','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='tempered-glass'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('memory-cards','Memory Cards','মেমোরি কার্ড','["product"]'::jsonb,7,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('memory-32gb','32GB','৩২ জিবি','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='memory-cards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('memory-64gb','64GB','৬৪ জিবি','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='memory-cards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('memory-128gb','128GB','১২৮ জিবি','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='memory-cards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('otg-adapters','OTG / Adapters','OTG / অ্যাডাপ্টার','["product"]'::jsonb,8,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('usb-otg','USB OTG','USB OTG','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='otg-adapters'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('type-c-otg','Type-C OTG','Type-C OTG','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='otg-adapters'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('multi-adapters','Multi Adapter','মাল্টি অ্যাডাপ্টার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='otg-adapters'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-accessories','Gaming Accessories','গেমিং অ্যাক্সেসরিজ','["product"]'::jsonb,9,TRUE,(SELECT id FROM categories WHERE slug='mobile-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('game-triggers','Trigger','ট্রিগার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='gaming-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('cooling-fans','Cooling Fan','কুলিং ফ্যান','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='gaming-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('finger-sleeves','Finger Sleeve','ফিঙ্গার স্লিভ','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='gaming-accessories'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('premium-gadgets','Premium Gadgets','প্রিমিয়াম গ্যাজেট','["product"]'::jsonb,1,TRUE,NULL)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('smartwatches','Smartwatches','স্মার্টওয়াচ','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('android-smartwatches','Android Smartwatch','অ্যান্ড্রয়েড স্মার্টওয়াচ','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='smartwatches'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('calling-smartwatches','Calling Smartwatch','কলিং স্মার্টওয়াচ','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='smartwatches'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('fitness-smartwatches','Fitness Smartwatch','ফিটনেস স্মার্টওয়াচ','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='smartwatches'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('bluetooth-speakers','Bluetooth Speakers','ব্লুটুথ স্পিকার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('portable-speakers','Portable Speaker','পোর্টেবল স্পিকার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='bluetooth-speakers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mini-speakers','Mini Speaker','মিনি স্পিকার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='bluetooth-speakers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('party-speakers','Party Speaker','পার্টি স্পিকার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='bluetooth-speakers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('microphones','Microphones','মাইক্রোফোন','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('lavalier-microphones','Lavalier Microphone','লাভালিয়ার মাইক','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='microphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-microphones','Wireless Microphone','ওয়্যারলেস মাইক','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='microphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('usb-microphones','USB Microphone','USB মাইক','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='microphones'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('vr-ar','VR / AR','VR / AR','["product"]'::jsonb,3,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('vr-headsets','VR Headset','VR হেডসেট','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='vr-ar'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('ar-glasses','AR Glass','AR গ্লাস','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='vr-ar'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('vr-ar-accessories','VR/AR Accessories','VR/AR অ্যাক্সেসরিজ','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='vr-ar'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('keyboards','Keyboards','কীবোর্ড','["product"]'::jsonb,4,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mechanical-keyboards','Mechanical Keyboard','মেকানিক্যাল কীবোর্ড','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='keyboards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-keyboards','Wireless Keyboard','ওয়্যারলেস কীবোর্ড','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='keyboards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('rgb-keyboards','RGB Keyboard','RGB কীবোর্ড','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='keyboards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mouse','Mouse','মাউস','["product"]'::jsonb,5,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('office-mouse','Office Mouse','অফিস মাউস','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='mouse'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-mouse','Gaming Mouse','গেমিং মাউস','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='mouse'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wireless-mouse','Wireless Mouse','ওয়্যারলেস মাউস','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='mouse'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('webcams','Webcams','ওয়েবক্যাম','["product"]'::jsonb,6,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('hd-webcams','HD Webcam','HD ওয়েবক্যাম','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='webcams'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('full-hd-webcams','Full HD Webcam','Full HD ওয়েবক্যাম','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='webcams'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('4k-webcams','4K Webcam','4K ওয়েবক্যাম','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='webcams'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('smart-rings','Smart Rings','স্মার্ট রিং','["product"]'::jsonb,7,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('health-rings','Health Ring','হেলথ রিং','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='smart-rings'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('nfc-rings','NFC Ring','NFC রিং','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='smart-rings'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('premium-rings','Premium Ring','প্রিমিয়াম রিং','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='smart-rings'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('streaming-gear','Streaming Gear','স্ট্রিমিং গিয়ার','["product"]'::jsonb,8,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('capture-cards','Capture Card','ক্যাপচার কার্ড','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='streaming-gear'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('studio-lights','Studio Light','স্টুডিও লাইট','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='streaming-gear'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('streaming-stands','Stand','স্ট্যান্ড','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='streaming-gear'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-controllers','Gaming Controllers','গেমিং কন্ট্রোলার','["product"]'::jsonb,9,TRUE,(SELECT id FROM categories WHERE slug='premium-gadgets'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('android-controllers','Android Controller','অ্যান্ড্রয়েড কন্ট্রোলার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='gaming-controllers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('pc-controllers','PC Controller','পিসি কন্ট্রোলার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='gaming-controllers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('console-controllers','Console Controller','কনসোল কন্ট্রোলার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='gaming-controllers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('electronics','Electronics','ইলেকট্রনিক্স','["product"]'::jsonb,2,TRUE,NULL)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('routers','Routers','রাউটার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('wifi-routers','Wi-Fi Router','Wi-Fi রাউটার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='routers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('dual-band-routers','Dual Band Router','ডুয়াল ব্যান্ড রাউটার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='routers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-routers','Gaming Router','গেমিং রাউটার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='routers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('monitors','Monitors','মনিটর','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('full-hd-monitors','Full HD Monitor','Full HD মনিটর','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='monitors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('ips-monitors','IPS Monitor','IPS মনিটর','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='monitors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('gaming-monitors','Gaming Monitor','গেমিং মনিটর','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='monitors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('printers','Printers','প্রিন্টার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('inkjet-printers','Inkjet Printer','ইঙ্কজেট প্রিন্টার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='printers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('laser-printers','Laser Printer','লেজার প্রিন্টার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='printers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('thermal-printers','Thermal Printer','থার্মাল প্রিন্টার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='printers'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('scanners','Scanners','স্ক্যানার','["product"]'::jsonb,3,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('flatbed-scanners','Flatbed Scanner','ফ্ল্যাটবেড স্ক্যানার','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='scanners'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('portable-scanners','Portable Scanner','পোর্টেবল স্ক্যানার','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='scanners'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('document-scanners','Document Scanner','ডকুমেন্ট স্ক্যানার','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='scanners'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('ups','UPS','UPS','["product"]'::jsonb,4,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mini-ups','Mini UPS','মিনি UPS','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='ups'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('offline-ups','Offline UPS','অফলাইন UPS','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='ups'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('online-ups','Online UPS','অনলাইন UPS','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='ups'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('ssd','SSD','SSD','["product"]'::jsonb,5,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('sata-ssd','SATA SSD','SATA SSD','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='ssd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('nvme-ssd','NVMe SSD','NVMe SSD','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='ssd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('external-ssd','External SSD','এক্সটার্নাল SSD','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='ssd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('hdd','HDD','HDD','["product"]'::jsonb,6,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('internal-hdd','Internal HDD','ইন্টারনাল HDD','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='hdd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('external-hdd','External HDD','এক্সটার্নাল HDD','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='hdd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('nas-hdd','NAS HDD','NAS HDD','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='hdd'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('cctv','CCTV','CCTV','["product"]'::jsonb,7,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('ip-cameras','IP Camera','IP ক্যামেরা','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='cctv'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('dvr','DVR','DVR','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='cctv'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('nvr','NVR','NVR','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='cctv'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('projectors','Projectors','প্রজেক্টর','["product"]'::jsonb,8,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('mini-projectors','Mini Projector','মিনি প্রজেক্টর','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='projectors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('smart-projectors','Smart Projector','স্মার্ট প্রজেক্টর','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='projectors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('business-projectors','Business Projector','বিজনেস প্রজেক্টর','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='projectors'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('extension-boards','Extension Boards','এক্সটেনশন বোর্ড','["product"]'::jsonb,9,TRUE,(SELECT id FROM categories WHERE slug='electronics'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('basic-extension-boards','Basic Extension Board','বেসিক এক্সটেনশন বোর্ড','["product"]'::jsonb,0,TRUE,(SELECT id FROM categories WHERE slug='extension-boards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('surge-protectors','Surge Protection Board','সার্জ প্রোটেকশন বোর্ড','["product"]'::jsonb,1,TRUE,(SELECT id FROM categories WHERE slug='extension-boards'))
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categories (slug,name_en,name_bn,applies_to,sort_order,is_active,parent_id)
VALUES ('usb-power-strips','USB Power Strip','USB পাওয়ার স্ট্রিপ','["product"]'::jsonb,2,TRUE,(SELECT id FROM categories WHERE slug='extension-boards'))
ON CONFLICT (slug) DO NOTHING;
COMMIT;
