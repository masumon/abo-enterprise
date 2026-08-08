"""product_import_jobs — audit history for the admin Bulk Product Import.

Shipped as migrations/032_product_import_jobs.sql for manual runs (Render free
tier where alembic is not run) — this is the alembic equivalent so a fresh
deploy creates the table too. Idempotent; no-op downgrade, since dropping it
would discard the import audit trail.

Revision ID: 0029
Revises: 0028
Create Date: 2026-08-08
"""

from typing import Sequence

from alembic import op

revision: str = "0029"
down_revision: str | None = "0028"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS product_import_jobs (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            admin_id       UUID,
            filename       VARCHAR(255),
            total_rows     INTEGER NOT NULL DEFAULT 0,
            created_count  INTEGER NOT NULL DEFAULT 0,
            updated_count  INTEGER NOT NULL DEFAULT 0,
            skipped_count  INTEGER NOT NULL DEFAULT 0,
            error_count    INTEGER NOT NULL DEFAULT 0,
            errors         JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_product_import_jobs_created ON product_import_jobs (created_at DESC)")


def downgrade() -> None:
    # No-op: dropping this would discard the import audit trail.
    pass
