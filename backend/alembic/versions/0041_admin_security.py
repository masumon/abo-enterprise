"""admin_security — recovery codes, TOTP replay guard, session revocation and
account lockout for admin users.

All columns are additive and safe for existing rows:
  * totp_recovery_codes  JSON list of hashed one-time recovery codes (NULL = none yet)
  * totp_last_step       last accepted 30-second TOTP step (blocks code re-use)
  * token_version        bumped to sign a user out of every device (default 0, matches
                         tokens issued before this migration, which carry no version)
  * failed_login_count / locked_until   per-account lockout (survives restarts)

Revision ID: 0041
Revises: 0040
Create Date: 2026-10-08
"""

from typing import Sequence

from alembic import op

revision: str = "0041"
down_revision: str | None = "0040"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_recovery_codes TEXT")
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT")
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ")


def downgrade() -> None:
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS locked_until")
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS failed_login_count")
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS token_version")
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS totp_last_step")
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS totp_recovery_codes")
