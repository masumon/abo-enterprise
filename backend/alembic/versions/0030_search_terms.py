"""search_terms — popular-search analytics for the storefront search.

Shipped as migrations/033_search_terms.sql for manual runs (Render free tier
where alembic is not run) — this is the alembic equivalent so a fresh deploy
creates the table too. Idempotent; no-op downgrade.

Revision ID: 0030
Revises: 0029
Create Date: 2026-08-08
"""

from typing import Sequence

from alembic import op

revision: str = "0030"
down_revision: str | None = "0029"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS search_terms (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            term       VARCHAR(100) NOT NULL UNIQUE,
            count      INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_terms_count ON search_terms (count DESC)")


def downgrade() -> None:
    # No-op: dropping this would discard search analytics.
    pass
