"""service_fulfilment — where a service is completed (additive).

Adds a nullable ``fulfilment`` column to ``services``: remote | at_shop |
hybrid. NULL (the value on every existing row) means unclassified, and the
public pages stay silent for it — exactly today's behaviour.

This mirrors ``manual_sql/0008_service_fulfilment.sql``, which the repository
owner has already executed against production. The statement is idempotent
(IF NOT EXISTS), so upgrading a database that already has the column is a
no-op, and a fresh database gets it from Alembic alone.

Additive; no-op downgrade → zero data loss.

Revision ID: 0018
Revises: 0017
Create Date: 2026-07-30
"""

from typing import Sequence

from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS fulfilment VARCHAR(20)")
    op.execute(
        "COMMENT ON COLUMN services.fulfilment IS "
        "'Where the service is completed: remote | at_shop | hybrid. "
        "NULL = unspecified (pre-0008 behaviour).'"
    )


def downgrade() -> None:
    # Additive-only; leaving the column in place is safe. No-op by design.
    pass
