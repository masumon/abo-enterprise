"""Optional TOTP two-factor auth columns for admin accounts."""
from typing import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT")
    op.execute("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE")


def downgrade() -> None:
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS totp_secret")
    op.execute("ALTER TABLE admin_users DROP COLUMN IF EXISTS totp_enabled")
