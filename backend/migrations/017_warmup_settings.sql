-- ABO Enterprise — Warmup Screen Admin-Configurable Settings
-- Migration: 017_warmup_settings.sql

INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES
    ('warmup_business_showcase_json',
     '[{"en":"Mobile Accessories","bn":"মোবাইল এক্সেসরিজ"},{"en":"Printing Services","bn":"প্রিন্টিং সার্ভিসেস"},{"en":"Legal Services","bn":"লিগ্যাল সার্ভিসেস"},{"en":"Digital Services","bn":"ডিজিটাল সার্ভিসেস"},{"en":"AI Solutions","bn":"AI সলিউশন্স"},{"en":"Custom Software","bn":"কাস্টম সফটওয়্যার"}]',
     'json',
     'Rotating business showcase items shown on the API warmup loading screen (JSON array of {en, bn})',
     true),

    ('warmup_trust_indicators_json',
     '[{"value":"12k+","icon":"users","en":"Happy Customers","bn":"সন্তুষ্ট গ্রাহক"},{"value":"850+","icon":"package","en":"Products","bn":"পণ্য"},{"value":"320+","icon":"briefcase","en":"Business Clients","bn":"ব্যবসায়িক ক্লায়েন্ট"},{"value":"100%","icon":"shield-check","en":"Secure Orders","bn":"নিরাপদ অর্ডার"}]',
     'json',
     'Trust indicator stats shown on the API warmup loading screen (JSON array of {value, icon, en, bn})',
     true),

    ('warmup_featured_carousel_json',
     '[{"type":"service","en":"Express Printing","bn":"এক্সপ্রেস প্রিন্টিং"},{"type":"product","en":"Fast-Charge Accessories","bn":"ফাস্ট-চার্জ এক্সেসরিজ"},{"type":"service","en":"Legal Document Support","bn":"লিগ্যাল ডকুমেন্ট সাপোর্ট"},{"type":"service","en":"Business AI Automation","bn":"বিজনেস AI অটোমেশন"}]',
     'json',
     'Featured carousel items shown on the API warmup loading screen (JSON array of {type, en, bn})',
     true),

    ('warmup_review_highlights_json',
     '[{"en":"\u201cGreat quality and fast support. Everything in one platform.\u201d","bn":"\u201c\u09a6\u09be\u09b0\u09c1\u09a3 \u09ae\u09be\u09a8 \u0993 \u09a6\u09cd\u09b0\u09c1\u09a4 \u09b8\u09be\u09aa\u09cb\u09b0\u09cd\u099f\u0964 \u098f\u0995 \u09aa\u09cd\u09b2\u09be\u099f\u09ab\u09b0\u09cd\u09ae\u09c7 \u09b8\u09ac \u09b8\u09ae\u09be\u09a7\u09be\u09a8\u0964\u201d","by":"Rahim Enterprise"},{"en":"\u201cReliable services with clear communication and secure delivery.\u201d","bn":"\u201c\u09ac\u09bf\u09b6\u09cd\u09ac\u09be\u09b8\u09af\u09cb\u0997\u09cd\u09af \u09b8\u09c7\u09ac\u09be, \u09b8\u09cd\u09aa\u09b7\u09cd\u099f \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997 \u0993 \u09a8\u09bf\u09b0\u09be\u09aa\u09a6 \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf\u0964\u201d","by":"Nusrat Traders"}]',
     'json',
     'Customer review highlights shown on the API warmup loading screen (JSON array of {en, bn, by})',
     true),

    ('warmup_welcome_en', 'Welcome!', 'string', 'English welcome heading on warmup screen', true),
    ('warmup_welcome_bn', 'স্বাগতম!', 'string', 'Bengali welcome heading on warmup screen', true),
    ('warmup_subtitle_en', 'All your business solutions in one platform.', 'string', 'English subtitle on warmup screen', true),
    ('warmup_subtitle_bn', 'আপনার ব্যবসার সব সমাধান এক প্ল্যাটফর্মে।', 'string', 'Bengali subtitle on warmup screen', true),
    ('warmup_offer_en', 'Free business consultation for new clients today.', 'string', 'English offer text on warmup screen', true),
    ('warmup_offer_bn', 'নতুন ক্লায়েন্টদের জন্য ফ্রি বিজনেস কনসাল্টেশন।', 'string', 'Bengali offer text on warmup screen', true)
ON CONFLICT (key) DO NOTHING;
