"""passkeys table (WebAuthn sign-in). Mirrors backend/manual_sql/0046_passkeys.sql.

Revision ID: 0044
Revises: 0043
"""
from alembic import op

revision: str = "0044"
down_revision: str | None = "0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS passkeys (
            id UUID PRIMARY KEY,
            owner_type VARCHAR(20) NOT NULL,
            owner_ref VARCHAR(255) NOT NULL,
            credential_id VARCHAR(512) NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            sign_count BIGINT DEFAULT 0,
            transports JSON DEFAULT '[]',
            name VARCHAR(120),
            created_at TIMESTAMPTZ DEFAULT now(),
            last_used_at TIMESTAMPTZ,
            is_deleted BOOLEAN DEFAULT false
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_passkeys_owner_type ON passkeys (owner_type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_passkeys_owner_ref ON passkeys (owner_ref)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_passkeys_credential_id ON passkeys (credential_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS passkeys")
