-- Attach the three top-level categories created by the bulk import under the
-- matching existing branches, so parent filters (মোবাইল অ্যাক্সেসরিজ, প্রিমিয়াম গ্যাজেট,
-- চার্জার, ইয়ারফোন) include their products. Only parent_id changes; no product,
-- slug or URL changes. Idempotent. Undo: set parent_id back to NULL for these slugs.
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'chargers'), updated_at = now()
 WHERE slug = 'chargers-adapters' AND parent_id IS NULL AND EXISTS (SELECT 1 FROM categories WHERE slug = 'chargers');
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'earphones'), updated_at = now()
 WHERE slug = 'earbuds' AND parent_id IS NULL AND EXISTS (SELECT 1 FROM categories WHERE slug = 'earphones');
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'bluetooth-speakers'), updated_at = now()
 WHERE slug = 'speakers' AND parent_id IS NULL AND EXISTS (SELECT 1 FROM categories WHERE slug = 'bluetooth-speakers');
SELECT c.slug, p.slug AS parent FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
 WHERE c.slug IN ('chargers-adapters','earbuds','speakers');
