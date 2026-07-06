"""schema_sync_columns — idempotent column/index patches.

Converts all runtime schema patches previously applied by
app.core.schema_sync (called from main.py on every startup) into a
proper Alembic migration.  Every statement uses IF NOT EXISTS so the
migration is safe to re-run against an already-patched database.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-06
"""

from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # products — extended catalog fields
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS canonical_url TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS og_image TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(8,3)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_info TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_info TEXT")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_price NUMERIC(10,2)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_ends_at TIMESTAMPTZ")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2)")

    # ------------------------------------------------------------------
    # services — SEO + detail blocks
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_title TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_description TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS seo_keywords TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS canonical_url TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS og_image TEXT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS process_steps JSONB DEFAULT '[]'::jsonb")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb")

    # ------------------------------------------------------------------
    # service_booking_forms — form extras
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS default_value TEXT")
    op.execute("ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS validation_rules JSONB")
    op.execute("ALTER TABLE service_booking_forms ADD COLUMN IF NOT EXISTS conditional_logic JSONB")

    # ------------------------------------------------------------------
    # reviews — admin reply
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT")
    op.execute("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ")

    # ------------------------------------------------------------------
    # orders — checkout extensions
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_provider TEXT")
    op.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_id TEXT")

    # ------------------------------------------------------------------
    # Indexes
    # ------------------------------------------------------------------
    op.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)")


def downgrade() -> None:
    # Columns added with IF NOT EXISTS are safe to leave in place.
    # Dropping them risks data loss on a live database, so downgrade
    # is intentionally left as a no-op.  Remove columns manually if
    # absolutely necessary.
    pass
