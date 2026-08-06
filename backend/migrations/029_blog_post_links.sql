-- 029_blog_post_links.sql — many-to-many links between blog posts and
-- products / services.
--
-- Run once in Supabase (SQL editor). Additive and idempotent — safe to re-run.
-- Nothing is dropped. Each row links one post to EITHER a product OR a service
-- (never both); a CHECK enforces that. Partial unique indexes make duplicate
-- links impossible, and ON DELETE CASCADE keeps the table clean when a post,
-- product, or service is hard-deleted.
--
-- The relationship is edited from both sides in the admin panel:
--   * Product / Service form  → picks which blog posts the item appears in
--   * Blog editor             → picks which products & services a post features
-- Both write here, so there is a single source of truth.

CREATE TABLE IF NOT EXISTS blog_post_links (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_post_id  UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
    service_id    UUID REFERENCES services(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blog_post_links_one_target CHECK (
        (product_id IS NOT NULL AND service_id IS NULL) OR
        (product_id IS NULL AND service_id IS NOT NULL)
    )
);

-- No duplicate (post, product) or (post, service) pairs.
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_post_links_product
    ON blog_post_links (blog_post_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_post_links_service
    ON blog_post_links (blog_post_id, service_id) WHERE service_id IS NOT NULL;

-- Reverse lookups (product/service → its blogs) and forward (post → items).
CREATE INDEX IF NOT EXISTS ix_blog_post_links_blog    ON blog_post_links (blog_post_id);
CREATE INDEX IF NOT EXISTS ix_blog_post_links_product ON blog_post_links (product_id);
CREATE INDEX IF NOT EXISTS ix_blog_post_links_service ON blog_post_links (service_id);
