"""newsletter_subscribers — real table replacing the newsletter_subscribers
Setting JSON blob (no timestamps, no unsubscribe state, and a
check-then-write race under concurrent signups).

Mirrors ``manual_sql/0024_newsletter_subscribers.sql``, including the
one-time backfill of any emails already sitting in the old JSON blob.

Revision ID: 0024
Revises: 0023
Create Date: 2026-08-05
"""

from typing import Sequence

from alembic import op

revision: str = "0024"
down_revision: str | None = "0023"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            source VARCHAR(50),
            subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            unsubscribed_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email)")
    op.execute("""
        INSERT INTO newsletter_subscribers (email, source)
        SELECT DISTINCT lower(trim(elem)), 'legacy_import'
        FROM settings s,
             LATERAL jsonb_array_elements_text(
                 CASE WHEN s.value IS NOT NULL AND s.value <> '' THEN s.value::jsonb ELSE '[]'::jsonb END
             ) AS elem
        WHERE s.key = 'newsletter_subscribers'
          AND s.is_deleted = FALSE
          AND trim(elem) <> ''
        ON CONFLICT (email) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS newsletter_subscribers")
