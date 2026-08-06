"""blog_post_links — many-to-many links between blog posts and products/services.

One table links a post to EITHER a product OR a service (CHECK-enforced).
Shipped as migrations/029_blog_post_links.sql for manual runs (Render free tier
where alembic is not run) — this is the alembic equivalent so a fresh deploy
creates the table too. Idempotent; no-op downgrade, since dropping it would
discard admin-configured links.

Revision ID: 0026
Revises: 0025
Create Date: 2026-08-06
"""

from typing import Sequence

from alembic import op

revision: str = "0026"
down_revision: str | None = "0025"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
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
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_post_links_product "
        "ON blog_post_links (blog_post_id, product_id) WHERE product_id IS NOT NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_post_links_service "
        "ON blog_post_links (blog_post_id, service_id) WHERE service_id IS NOT NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_blog_post_links_blog ON blog_post_links (blog_post_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_blog_post_links_product ON blog_post_links (product_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_blog_post_links_service ON blog_post_links (service_id)")


def downgrade() -> None:
    # No-op: dropping the table would discard admin-configured links.
    pass
