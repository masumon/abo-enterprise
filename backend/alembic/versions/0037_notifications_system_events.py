"""notifications_system_events — persistent per-admin notification feed and
a durable system-event log, replacing the in-process ring buffers in
app.core.ops_events (recent_errors/failed_emails/failed_logins) that are
lost on every restart/deploy.

Revision ID: 0037
Revises: 0036
Create Date: 2026-08-12
"""

from typing import Sequence

from alembic import op

revision: str = "0037"
down_revision: str | None = "0036"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'info',
            title VARCHAR(255) NOT NULL,
            body TEXT,
            target_admin_id UUID REFERENCES admin_users(id),
            link VARCHAR(500),
            meta JSON NOT NULL DEFAULT '{}',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications(type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_target_admin_id ON notifications(target_admin_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS system_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'error',
            source VARCHAR(100) NOT NULL DEFAULT 'app',
            message TEXT NOT NULL,
            meta JSON NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_events_event_type ON system_events(event_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_events_severity ON system_events(severity)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_events_created_at ON system_events(created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS system_events")
    op.execute("DROP TABLE IF EXISTS notifications")
