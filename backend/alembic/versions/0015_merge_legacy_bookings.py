"""merge_legacy_bookings — one booking table.

The printing/legal landing pages wrote to the original `bookings` table while
everything else used `bookings_v2`, giving two intake tables, two admin tabs
and two reporting paths. This merges them.

`bookings_v2.service_id` becomes nullable so a booking that isn't tied to a
catalog service (the legacy forms, and future walk-in intake) can live in the
same table. Existing rows are unaffected — nothing is dropped, and the old
`bookings` table is deliberately KEPT as an untouched archive.

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE bookings_v2 ALTER COLUMN service_id DROP NOT NULL")

    # Copy every legacy booking across, keeping its original booking_number so
    # existing customer receipts and /track lookups keep resolving. Matched to
    # a real service by slug where one exists; NULL otherwise.
    # Re-runnable: ON CONFLICT DO NOTHING on the unique booking_number.
    op.execute(
        """
        INSERT INTO bookings_v2 (
            id, booking_number, service_id, service_name, customer_name,
            customer_phone, customer_email, details, status, pricing_type,
            payment_status, notes, created_at, updated_at, is_deleted
        )
        SELECT
            b.id,
            b.booking_number,
            s.id,
            COALESCE(
                s.name_en,
                INITCAP(REPLACE(b.service_type, '_', ' '))
                  || COALESCE(' — ' || INITCAP(REPLACE(b.service_subtype, '_', ' ')), '')
            ),
            b.customer_name,
            b.customer_phone,
            b.customer_email,
            b.details,
            CASE WHEN b.status = 'contacted' THEN 'confirmed' ELSE b.status END,
            'custom_quote',
            'pending',
            'Migrated from the legacy booking system.'
              || COALESCE(' Estimated price: ' || b.estimated_price, ''),
            b.created_at,
            b.updated_at,
            b.is_deleted
          FROM bookings b
          LEFT JOIN services s
            ON s.is_deleted = FALSE
           AND s.slug = REPLACE(b.service_type, '_', '-')
         ON CONFLICT (booking_number) DO NOTHING
        """
    )


def downgrade() -> None:
    # No-op. The legacy rows still exist in `bookings`; re-imposing NOT NULL
    # would fail against any booking legitimately created without a service.
    pass
