"""unify_service_category — one taxonomy for services.

Services carried two parallel classifications: the required free string
`services.category` (a hardcoded frontend list using underscores) and the
`category_id`/`subcategory_id` FKs into the `categories` tree (hyphen slugs).
The two vocabularies never intersected, so nothing kept them in sync.

This backfills `category_id` from the legacy string wherever a tree node can
be matched, then keeps `category` as a *derived cache* of the linked node's
slug — every existing query, filter and URL that reads the string keeps
working. Nothing is dropped and unmatched services are left untouched.

Revision ID: 0014
Revises: 0013
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Legacy string → tree slug. Derived from the shipped admin list and the
# seeded taxonomy; the underscore/hyphen pairs plus the aliases the public
# services page already redirected between.
ALIASES = """
      ('digital_services',  'digital-e-services'),
      ('print_documentation','printing-documentation'),
      ('printing',          'printing-documentation'),
      ('mobile_software',   'mobile-lab'),
      ('computer_software', 'it-support'),
      ('business_software', 'business-consultancy'),
      ('ai_solutions',      'ai-automation'),
      ('automation',        'ai-automation'),
      ('web_software',      'web-software'),
      ('web_development',   'web-software'),
      ('software',          'web-software'),
      ('general',           'others')
"""


def upgrade() -> None:
    # 1. Direct slug match (string already equals a node slug, or differs only
    #    by underscores) — safest, no guessing.
    op.execute(
        """
        UPDATE services s
           SET category_id = c.id
          FROM categories c
         WHERE s.category_id IS NULL
           AND s.is_deleted = FALSE
           AND c.is_deleted = FALSE
           AND c.slug = REPLACE(s.category, '_', '-')
        """
    )
    # 2. Curated aliases for the pairs that don't normalise cleanly.
    op.execute(
        f"""
        UPDATE services s
           SET category_id = c.id
          FROM categories c, (VALUES {ALIASES}) AS m(legacy, slug)
         WHERE s.category_id IS NULL
           AND s.is_deleted = FALSE
           AND c.is_deleted = FALSE
           AND s.category = m.legacy
           AND c.slug = m.slug
        """
    )
    # 3. The string becomes a cache of the linked node's slug, so both
    #    classifications finally agree. Services with no match keep their
    #    original string and stay exactly as they are.
    op.execute(
        """
        UPDATE services s
           SET category = c.slug
          FROM categories c
         WHERE s.category_id = c.id
           AND s.is_deleted = FALSE
           AND s.category IS DISTINCT FROM c.slug
        """
    )


def downgrade() -> None:
    # No-op: the backfill is additive and the original strings that could not
    # be matched were never modified.
    pass
