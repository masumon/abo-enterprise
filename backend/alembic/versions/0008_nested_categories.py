"""nested_categories — unlimited-depth taxonomy via categories.parent_id.

Adds a self-referencing ``parent_id`` to ``categories`` and unifies the legacy
two-level taxonomy into it: every ``subcategories`` row is copied into
``categories`` **with the same UUID** and ``parent_id`` set to its old parent.
Because the UUIDs are identical, existing ``products.subcategory_id`` /
``services.subcategory_id`` values keep pointing at valid tree nodes without
touching a single item row.

The ``subcategories`` table is left in place (frozen) so its FK constraints
and any not-yet-deployed reader keep working. Slugs that would collide with
an existing category slug get a short id suffix — collisions are unexpected
in practice and nested routes resolve slugs per-level anyway.

Everything is IF NOT EXISTS / WHERE NOT EXISTS guarded: safe to re-run,
zero data loss. Downgrade is a no-op (additive migration).

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-17
"""

from typing import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # 1. Self-referencing parent column
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID")
    op.execute(
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_categories_parent'
          ) THEN
            ALTER TABLE categories
              ADD CONSTRAINT fk_categories_parent
              FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;
          END IF;
        END $$;
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)")

    # 2. Unify: copy each legacy subcategory into categories (same UUID,
    #    parent_id = its old category, applies_to inherited from the parent).
    op.execute(
        """
        INSERT INTO categories (
            id, slug, name_en, name_bn, description_en, description_bn,
            icon, image_url, applies_to, sort_order, is_active,
            created_at, updated_at, is_deleted, parent_id
        )
        SELECT
            s.id,
            CASE WHEN EXISTS (SELECT 1 FROM categories c2 WHERE c2.slug = s.slug)
                 THEN s.slug || '-' || substr(s.id::text, 1, 4)
                 ELSE s.slug END,
            s.name_en, s.name_bn, s.description_en, s.description_bn,
            s.icon, s.image_url,
            COALESCE(p.applies_to, '[]'::jsonb),
            s.sort_order, s.is_active,
            s.created_at, s.updated_at, s.is_deleted, s.category_id
        FROM subcategories s
        JOIN categories p ON p.id = s.category_id
        WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = s.id)
        """
    )


def downgrade() -> None:
    # Additive-only: dropping parent_id / migrated rows would orphan item FKs.
    pass
