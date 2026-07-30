"""service_turnaround — how long a service takes, in working days (additive).

Adds nullable ``turnaround_days_min`` / ``turnaround_days_max`` to ``services``.
Screen 08c publishes a turnaround for every government service, because for an
application the customer cannot chase themselves the wait is the product. Two
columns because these are ranges in practice; one number would force the shop
to over-promise the fast case or under-sell the normal one.

NULL on every existing row, and a service with no turnaround set says nothing
about time — exactly today's behaviour.

Mirrors ``manual_sql/0011_service_turnaround.sql``. Idempotent
(IF NOT EXISTS), so upgrading a database where that file has already been run
is a no-op, and a fresh database gets the columns from Alembic alone.

Additive; no-op downgrade → zero data loss.

Revision ID: 0021
Revises: 0020
Create Date: 2026-07-30
"""

from typing import Sequence

from alembic import op

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS turnaround_days_min SMALLINT")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS turnaround_days_max SMALLINT")
    op.execute(
        "COMMENT ON COLUMN services.turnaround_days_min IS "
        "'Fastest realistic completion in working days. NULL = not published.'"
    )
    op.execute(
        "COMMENT ON COLUMN services.turnaround_days_max IS "
        "'Usual upper bound in working days. NULL = not published. Set both, or neither.'"
    )


def downgrade() -> None:
    # Additive-only; leaving the columns in place is safe. No-op by design.
    pass
