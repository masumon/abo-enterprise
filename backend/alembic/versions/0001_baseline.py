"""baseline — schema already exists (manual SQL migrations + create_all).

This revision is intentionally empty. Existing environments should be
stamped with `alembic stamp head` so Alembic knows the current schema
matches the ORM without trying to recreate any tables. All future schema
changes MUST be added as new revisions on top of this one.

Revision ID: 0001
Revises:
Create Date: 2026-07-02
"""

from typing import Sequence

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:  # noqa: D401
    """No-op — schema pre-exists."""
    pass


def downgrade() -> None:  # noqa: D401
    """No-op — see upgrade()."""
    pass
