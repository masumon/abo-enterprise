"""dedupe_services — retire the 5 bootstrap-duplicate services (soft delete).

Historically services were seeded from two places: ``content_bootstrap.py``
(6 services, on first boot of an empty DB) and migration
``004_services_system.sql`` (12 curated services). Deployments that ran both
ended up with near-identical pairs (e.g. "Printing Services" + "Printing
Service", two "Mobile App Development" rows). The bootstrap slugs
``printing``/``legal``/``software`` additionally collide with the static
information pages at /services/printing|legal|software.

This migration soft-deletes each bootstrap duplicate ONLY when its curated
004 counterpart exists and is live — nothing is hard-deleted, booking history
stays intact (bookings keep their service_id + denormalized service_name),
and re-running is a no-op. The bootstrap seed list itself is aligned with the
curated 12 in the same release, so fresh deployments can never recreate the
duplicates.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-16
"""

from typing import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# (bootstrap duplicate slug, curated 004 slug that supersedes it)
DUPLICATE_SERVICE_PAIRS: list[tuple[str, str]] = [
    ("printing", "printing-service"),
    ("legal", "legal-services"),
    ("software", "custom-software"),
    ("web-design", "website-development"),
    ("mobile-app", "mobile-app-development"),
]


def upgrade() -> None:
    bind = op.get_bind()
    dedupe_sql = sa.text(
        """
        UPDATE services dup
        SET is_deleted = TRUE, is_active = FALSE
        WHERE dup.slug = :dup_slug
          AND dup.is_deleted = FALSE
          AND EXISTS (
            SELECT 1 FROM services keeper
            WHERE keeper.slug = :keep_slug AND keeper.is_deleted = FALSE
          )
        """
    )
    for dup_slug, keep_slug in DUPLICATE_SERVICE_PAIRS:
        bind.execute(dedupe_sql, {"dup_slug": dup_slug, "keep_slug": keep_slug})


def downgrade() -> None:
    # Soft-deletes are reversible by hand (is_deleted = FALSE); an automatic
    # downgrade could resurrect rows an admin intentionally deleted. No-op.
    pass
