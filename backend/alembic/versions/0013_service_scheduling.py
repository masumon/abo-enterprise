"""service_scheduling — optional per-service appointment scheduling.

Adds the scheduling configuration to services. scheduling_enabled defaults to
FALSE, so every existing service keeps today's behaviour exactly: booking_date
stays an unconstrained "preferred date". Additive and idempotent; no-op
downgrade. Mirrors migrations/027_service_scheduling.sql for manual runs.

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_capacity INTEGER")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb")
    op.execute("ALTER TABLE services ADD COLUMN IF NOT EXISTS holidays JSONB DEFAULT '[]'::jsonb")
    # Availability is counted by (service, slot); this makes that count cheap.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_bookings_v2_service_slot "
        "ON bookings_v2 (service_id, booking_date)"
    )


def downgrade() -> None:
    # No-op: dropping these would discard admin-configured working hours.
    pass
