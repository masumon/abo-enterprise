"""pages_cms — generic CMS page (slug, title, content, SEO, draft/publish),
independent of Blog/Product/Service, for one-off content that needs its own
URL without being any of those specific content types.

Revision ID: 0039
Revises: 0038
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0039"
down_revision: str | None = "0038"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS pages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(255) NOT NULL UNIQUE,
            title_en VARCHAR(500) NOT NULL,
            title_bn VARCHAR(500),
            content_en TEXT NOT NULL,
            content_bn TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            published_at TIMESTAMPTZ,
            seo_title VARCHAR(255),
            seo_description TEXT,
            seo_keywords VARCHAR(500),
            canonical_url VARCHAR(500),
            og_image TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_pages_slug ON pages(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_pages_status ON pages(status)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS pages")
