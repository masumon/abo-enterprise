-- Seed featured reviews (run after 007_reviews.sql)
INSERT INTO reviews (customer_name, company, rating, review_en, review_bn, source, is_verified, is_featured, is_active)
VALUES
  ('Rahim Uddin', 'Shop Owner, Sylhet', 5, 'ABO built our POS in 2 weeks. Billing errors dropped to zero!', 'ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!', 'Google', TRUE, TRUE, TRUE),
  ('Fatema Begum', 'Restaurant Owner', 5, 'Restaurant software transformed our kitchen operations.', 'রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।', 'Facebook', TRUE, TRUE, TRUE),
  ('Karim Hassan', 'IT Manager', 5, 'Custom ERP delivered on time with AI features.', 'AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।', 'Direct', FALSE, TRUE, TRUE),
  ('Nusrat Jahan', 'Freelancer', 5, 'Top quality accessories, same-day delivery!', 'সেরা মান, একই দিনে ডেলিভারি!', 'Google', TRUE, TRUE, TRUE)
ON CONFLICT DO NOTHING;
