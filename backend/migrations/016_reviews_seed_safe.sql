-- Safe review seed — only inserts when customer_name does not already exist.
-- Fixes empty reviews table when 007_reviews_seed.sql ON CONFLICT failed (no unique key).
-- Idempotent: safe to re-run.
--
-- NOTE: INSERT ... SELECT does not apply column DEFAULTs in PostgreSQL.
-- Must set id explicitly via gen_random_uuid().

INSERT INTO reviews (id, customer_name, company, rating, review_en, review_bn, source, is_verified, is_featured, is_active, photo_url)
SELECT gen_random_uuid(), 'Rahim Uddin', 'Shop Owner, Sylhet', 5,
  'ABO built our POS in 2 weeks. Billing errors dropped to zero!',
  'ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!',
  'Google', TRUE, TRUE, TRUE, 'https://placehold.co/256x256/webp?text=Rahim%20Uddin'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Rahim Uddin');

INSERT INTO reviews (id, customer_name, company, rating, review_en, review_bn, source, is_verified, is_featured, is_active, photo_url)
SELECT gen_random_uuid(), 'Fatema Begum', 'Restaurant Owner', 5,
  'Restaurant software transformed our kitchen operations.',
  'রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।',
  'Facebook', TRUE, TRUE, TRUE, 'https://placehold.co/256x256/webp?text=Fatema%20Begum'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Fatema Begum');

INSERT INTO reviews (id, customer_name, company, rating, review_en, review_bn, source, is_verified, is_featured, is_active, photo_url)
SELECT gen_random_uuid(), 'Karim Hassan', 'IT Manager', 5,
  'Custom ERP delivered on time with AI features.',
  'AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।',
  'Direct', FALSE, TRUE, TRUE, 'https://placehold.co/256x256/webp?text=Karim%20Hassan'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Karim Hassan');

INSERT INTO reviews (id, customer_name, company, rating, review_en, review_bn, source, is_verified, is_featured, is_active, photo_url)
SELECT gen_random_uuid(), 'Nusrat Jahan', 'Freelancer', 5,
  'Top quality accessories, same-day delivery!',
  'সেরা মান, একই দিনে ডেলিভারি!',
  'Google', TRUE, TRUE, TRUE, 'https://placehold.co/256x256/webp?text=Nusrat%20Jahan'
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Nusrat Jahan');
