"""combos + combo_items — bundle packs sold at a single combo price.

Shipped as migrations/030_combos.sql for manual runs (Render free tier where
alembic is not run) — this is the alembic equivalent so a fresh deploy creates
the tables too. Idempotent; no-op downgrade, since dropping the tables would
discard admin-configured combos.

Revision ID: 0027
Revises: 0026
Create Date: 2026-08-07
"""

from typing import Sequence

from alembic import op

revision: str = "0027"
down_revision: str | None = "0026"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS combos (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug             VARCHAR(255) NOT NULL UNIQUE,
            title_en         VARCHAR(255) NOT NULL,
            title_bn         VARCHAR(255) NOT NULL,
            description_en   TEXT,
            description_bn   TEXT,
            image_url        TEXT,
            combo_price      NUMERIC(10,2) NOT NULL,
            compare_at_price NUMERIC(10,2),
            badge_en         VARCHAR(80),
            badge_bn         VARCHAR(80),
            free_delivery    BOOLEAN NOT NULL DEFAULT FALSE,
            sort_order       INTEGER NOT NULL DEFAULT 0,
            is_active        BOOLEAN NOT NULL DEFAULT TRUE,
            starts_at        TIMESTAMPTZ,
            ends_at          TIMESTAMPTZ,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted       BOOLEAN NOT NULL DEFAULT FALSE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_combos_slug   ON combos (slug)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_combos_active ON combos (is_active)")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS combo_items (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            combo_id   UUID NOT NULL REFERENCES combos(id)   ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            quantity   INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_combo_items_combo   ON combo_items (combo_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_combo_items_product ON combo_items (product_id)")


def downgrade() -> None:
    # No-op: dropping these would discard admin-configured combos.
    pass
