"""commerce_taxonomy — normalized Category → Subcategory taxonomy (additive).

Creates the ``categories`` and ``subcategories`` tables and adds nullable
``category_id`` / ``subcategory_id`` foreign keys to ``products`` and
``services``. Existing string columns (``category`` / ``sub_category``) are
left untouched and kept as a backward-compatible cache, so every current
query, filter and URL keeps working.

The taxonomy rows are backfilled from the DISTINCT existing category /
sub-category strings and the new FK columns are populated by slug match. All
statements use IF NOT EXISTS / ON CONFLICT / guarded DO-blocks, so the
migration is safe to re-run and causes zero data loss. Downgrade is a no-op
(dropping the additive objects would risk data loss).

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-14
"""

from typing import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# Reusable SQL fragment: slugify an arbitrary label into a-z0-9 + dashes.
_SLUG = "lower(btrim(regexp_replace({col}, '[^a-zA-Z0-9]+', '-', 'g'), '-'))"


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Tables
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(120) NOT NULL UNIQUE,
            name_en VARCHAR(255) NOT NULL,
            name_bn VARCHAR(255),
            description_en TEXT,
            description_bn TEXT,
            icon VARCHAR(80),
            image_url TEXT,
            applies_to JSONB NOT NULL DEFAULT '[]'::jsonb,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS subcategories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            slug VARCHAR(120) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            name_bn VARCHAR(255),
            description_en TEXT,
            description_bn TEXT,
            icon VARCHAR(80),
            image_url TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            CONSTRAINT uq_subcategory_category_slug UNIQUE (category_id, slug)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_subcategories_is_active ON subcategories(is_active)")

    # ------------------------------------------------------------------
    # 2. Additive FK columns on products / services
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory_id UUID")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS subcategory_id UUID")

    for tbl, col, ref, name in [
        ("products", "category_id", "categories", "fk_products_category"),
        ("products", "subcategory_id", "subcategories", "fk_products_subcategory"),
        ("services", "category_id", "categories", "fk_services_category"),
        ("services", "subcategory_id", "subcategories", "fk_services_subcategory"),
    ]:
        op.execute(
            f"""
            DO $$ BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = '{name}'
              ) THEN
                ALTER TABLE {tbl}
                  ADD CONSTRAINT {name}
                  FOREIGN KEY ({col}) REFERENCES {ref}(id) ON DELETE SET NULL;
              END IF;
            END $$;
            """
        )

    op.execute("CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_services_subcategory_id ON services(subcategory_id)")

    # ------------------------------------------------------------------
    # 3. Backfill taxonomy from existing string columns (idempotent)
    # ------------------------------------------------------------------
    # Product categories → applies_to product
    op.execute(
        f"""
        INSERT INTO categories (slug, name_en, applies_to, is_active)
        SELECT DISTINCT {_SLUG.format(col='category')} AS slug, category, '["product"]'::jsonb, TRUE
        FROM products
        WHERE category IS NOT NULL AND btrim(category) <> ''
          AND {_SLUG.format(col='category')} <> ''
        ON CONFLICT (slug) DO NOTHING
        """
    )
    # Service categories → merge "service" into applies_to
    op.execute(
        f"""
        INSERT INTO categories (slug, name_en, applies_to, is_active)
        SELECT DISTINCT {_SLUG.format(col='category')} AS slug, category, '["service"]'::jsonb, TRUE
        FROM services
        WHERE category IS NOT NULL AND btrim(category) <> ''
          AND {_SLUG.format(col='category')} <> ''
        ON CONFLICT (slug) DO UPDATE
          SET applies_to = CASE
            WHEN categories.applies_to @> '["service"]'::jsonb THEN categories.applies_to
            ELSE categories.applies_to || '["service"]'::jsonb
          END
        """
    )
    # Product sub-categories → subcategories under matching category
    op.execute(
        f"""
        INSERT INTO subcategories (category_id, slug, name_en, is_active)
        SELECT DISTINCT c.id, {_SLUG.format(col='p.sub_category')} AS slug, p.sub_category, TRUE
        FROM products p
        JOIN categories c ON c.slug = {_SLUG.format(col='p.category')}
        WHERE p.sub_category IS NOT NULL AND btrim(p.sub_category) <> ''
          AND {_SLUG.format(col='p.sub_category')} <> ''
        ON CONFLICT (category_id, slug) DO NOTHING
        """
    )

    # ------------------------------------------------------------------
    # 4. Populate FK columns by slug match (idempotent — only where NULL)
    # ------------------------------------------------------------------
    op.execute(
        f"""
        UPDATE products p SET category_id = c.id
        FROM categories c
        WHERE p.category_id IS NULL
          AND c.slug = {_SLUG.format(col='p.category')}
        """
    )
    op.execute(
        f"""
        UPDATE products p SET subcategory_id = s.id
        FROM subcategories s
        WHERE p.subcategory_id IS NULL
          AND p.category_id IS NOT NULL
          AND s.category_id = p.category_id
          AND s.slug = {_SLUG.format(col='p.sub_category')}
        """
    )
    op.execute(
        f"""
        UPDATE services sv SET category_id = c.id
        FROM categories c
        WHERE sv.category_id IS NULL
          AND c.slug = {_SLUG.format(col='sv.category')}
        """
    )


def downgrade() -> None:
    # Additive-only migration. Dropping the tables/columns would destroy the
    # taxonomy and unlink products/services, so downgrade is intentionally a
    # no-op. Remove manually if absolutely required.
    pass
