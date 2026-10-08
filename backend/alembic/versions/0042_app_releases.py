"""app_releases / app_download_events — "Apon" mobile-app download page.

Additive: two new tables, nothing existing is changed. Mirrors
backend/manual_sql/0042_app_releases.sql (which is what is actually applied on Supabase).

Revision ID: 0042
Revises: 0041
Create Date: 2026-10-08
"""

from typing import Sequence

from alembic import op

revision: str = "0042"
down_revision: str | None = "0041"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS app_releases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version_name VARCHAR(40) NOT NULL,
            version_code INTEGER NOT NULL UNIQUE,
            file_name VARCHAR(120) NOT NULL,
            source_url TEXT NOT NULL,
            size_bytes BIGINT,
            sha256 VARCHAR(64),
            min_android VARCHAR(20),
            changelog_bn TEXT,
            changelog_en TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            is_current BOOLEAN NOT NULL DEFAULT FALSE,
            download_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS app_download_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            release_id UUID REFERENCES app_releases(id) ON DELETE SET NULL,
            ip_hash VARCHAR(64) NOT NULL,
            user_agent VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_app_download_events_ip_hash ON app_download_events (ip_hash)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_app_download_events_created_at ON app_download_events (created_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app_download_events")
    op.execute("DROP TABLE IF EXISTS app_releases")
