"""delivery_zones — admin-defined per-district/upazila delivery charges & free rules.

Shipped as migrations/031_delivery_zones.sql for manual runs (Render free tier
where alembic is not run) — this is the alembic equivalent so a fresh deploy
creates the table too. Idempotent; no-op downgrade, since dropping it would
discard admin-configured delivery rules.

Revision ID: 0028
Revises: 0027
Create Date: 2026-08-07
"""

from typing import Sequence

from alembic import op

revision: str = "0028"
down_revision: str | None = "0027"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS delivery_zones (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name_en        VARCHAR(120) NOT NULL,
            name_bn        VARCHAR(120) NOT NULL,
            districts      JSONB NOT NULL DEFAULT '[]'::jsonb,
            upazilas       JSONB NOT NULL DEFAULT '[]'::jsonb,
            charge         NUMERIC(10,2) NOT NULL DEFAULT 0,
            free_threshold NUMERIC(10,2),
            sort_order     INTEGER NOT NULL DEFAULT 0,
            is_active      BOOLEAN NOT NULL DEFAULT TRUE,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted     BOOLEAN NOT NULL DEFAULT FALSE
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_delivery_zones_active ON delivery_zones (is_active)")


def downgrade() -> None:
    # No-op: dropping this would discard admin-configured delivery rules.
    pass
