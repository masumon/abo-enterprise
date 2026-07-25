"""category_seo — per-category SEO overrides.

Category landing pages are often the highest-intent entry point, but their
metadata could only ever be derived from name_en/description_en. Adds the same
optional SEO fields services already have. All additive and idempotent
(IF NOT EXISTS); no-op downgrade so a rollback never drops admin-entered copy.

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255)")
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description TEXT")
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_keywords VARCHAR(500)")
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(500)")
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS og_image TEXT")


def downgrade() -> None:
    # Intentionally a no-op: dropping these would discard admin-entered SEO
    # copy, and leaving them costs nothing.
    pass
