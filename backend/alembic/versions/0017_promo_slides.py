"""promo_slides — admin-managed promo carousels (hero + flash sale).

One table drives every carousel; `placement` selects the surface. Shipped as
migrations/028_promo_slides.sql for manual runs — this is the alembic
equivalent so a fresh deploy creates the table too. Idempotent; no-op
downgrade, since dropping it would discard admin-uploaded slides.

Revision ID: 0017
Revises: 0016
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS promo_slides (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            placement   VARCHAR(40)  NOT NULL DEFAULT 'hero',
            image_url   TEXT,
            video_url   TEXT,
            link_url    TEXT,
            title_en    VARCHAR(255),
            title_bn    VARCHAR(255),
            alt_text    VARCHAR(255),
            sort_order  INTEGER      NOT NULL DEFAULT 0,
            is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
            starts_at   TIMESTAMPTZ,
            ends_at     TIMESTAMPTZ,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_promo_slides_placement ON promo_slides (placement)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_promo_slides_is_active ON promo_slides (is_active)")


def downgrade() -> None:
    # No-op: dropping the table would discard admin-uploaded slides.
    pass
