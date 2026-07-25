"""booking_location — normalized district/upazila on service bookings.

The booking form collected district and upazila, then concatenated them into
the free-text `details` column ("Location: X, Y\\n\\n..."), which made location
unqueryable, unfilterable and unreportable for a business whose operations are
organised by district. Adds the two columns; existing rows keep their prefixed
details untouched. Additive and idempotent; no-op downgrade.

Revision ID: 0012
Revises: 0011
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0012"
down_revision: str | None = "0011"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS district VARCHAR(100)")
    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS upazila VARCHAR(100)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bookings_v2_district ON bookings_v2 (district)"
    )


def downgrade() -> None:
    # No-op: dropping these would discard collected location data.
    pass
