"""Add the product-to-brand master relation without removing legacy brand text.

Revision ID: 0033
Revises: 0032
Create Date: 2026-08-11
"""

from typing import Sequence

from alembic import op

revision: str = "0033"
down_revision: str | None = "0032"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_brand_id'
            ) THEN
                ALTER TABLE products
                    ADD CONSTRAINT fk_products_brand_id
                    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;
            END IF;
        END;
        $$;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_products_brand_id ON products(brand_id)")
    op.execute("""
        UPDATE products AS p
        SET brand_id = b.id
        FROM brands AS b
        WHERE p.brand_id IS NULL
          AND p.brand IS NOT NULL
          AND b.is_deleted = FALSE
          AND (
              lower(trim(p.brand)) = lower(b.slug)
              OR lower(trim(p.brand)) = lower(b.name_en)
              OR (b.name_bn IS NOT NULL AND lower(trim(p.brand)) = lower(b.name_bn))
          )
    """)
    op.execute("""
        CREATE OR REPLACE FUNCTION sync_product_brand_master()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF NEW.brand IS NULL OR btrim(NEW.brand) = '' THEN
                NEW.brand_id := NULL;
            ELSE
                SELECT b.id INTO NEW.brand_id
                FROM brands AS b
                WHERE b.is_deleted = FALSE
                  AND (
                      lower(trim(NEW.brand)) = lower(b.slug)
                      OR lower(trim(NEW.brand)) = lower(b.name_en)
                      OR (b.name_bn IS NOT NULL AND lower(trim(NEW.brand)) = lower(b.name_bn))
                  )
                ORDER BY b.is_active DESC, b.sort_order ASC, b.created_at ASC
                LIMIT 1;
            END IF;
            RETURN NEW;
        END;
        $$;
    """)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_trigger t
                JOIN pg_class c ON c.oid = t.tgrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE t.tgname = 'trg_products_brand_master'
                  AND c.relname = 'products'
                  AND n.nspname = current_schema()
                  AND NOT t.tgisinternal
            ) THEN
                CREATE TRIGGER trg_products_brand_master
                BEFORE INSERT OR UPDATE OF brand ON products
                FOR EACH ROW EXECUTE FUNCTION sync_product_brand_master();
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    # Deliberately non-destructive: do not remove the master relation or history.
    pass
