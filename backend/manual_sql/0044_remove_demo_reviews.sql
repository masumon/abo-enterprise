-- Remove all demo/fake reviews (owner request 2026-10-11): soft delete, so nothing is
-- physically erased. Also clears the stored product star ratings that came from them.
-- Undo: UPDATE reviews SET is_deleted = false, is_active = true WHERE updated_at >= '<run time>';
SELECT count(*) AS reviews_before FROM reviews WHERE is_deleted = false;
UPDATE reviews SET is_deleted = true, is_active = false, is_featured = false, updated_at = now()
 WHERE is_deleted = false;
UPDATE products SET rating = NULL WHERE rating IS NOT NULL;
SELECT count(*) AS reviews_visible_after FROM reviews WHERE is_deleted = false;
