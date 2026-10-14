"""Optional video link on products and services; product variant groups.

Revision ID: 0043
Revises: 0042
"""
from alembic import op

revision: str = "0043"
down_revision: str | None = "0042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS video_url TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_group VARCHAR(64)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_label VARCHAR(80)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_products_variant_group ON products (variant_group)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_variant_group")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS variant_label")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS variant_group")
    op.execute("ALTER TABLE services DROP COLUMN IF EXISTS video_url")
    op.execute("ALTER TABLE products DROP COLUMN IF EXISTS video_url")
