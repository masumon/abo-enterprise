"""service_reviews_coupons — reviews for services, coupons on bookings.

Reviews were product-only (`reviews.product_id`), so a service had no rating
and no aggregateRating in its structured data. Coupons were order-only, so a
service booking could never be discounted.

Both are additive: existing product reviews and existing orders are untouched.

Revision ID: 0016
Revises: 0015
Create Date: 2026-07-25
"""

from typing import Sequence

from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Reviews can now hang off a service instead of a product. Both columns are
    # nullable; a review targets one or the other.
    op.execute(
        "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_id UUID "
        "REFERENCES services(id) ON DELETE SET NULL"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_reviews_service_id ON reviews (service_id)")

    # Coupon captured on the booking, mirroring orders.coupon_code /
    # orders.discount_amount so reporting reads the same shape for both.
    op.execute("ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50)")
    op.execute(
        "ALTER TABLE bookings_v2 ADD COLUMN IF NOT EXISTS discount_amount "
        "NUMERIC(10,2) NOT NULL DEFAULT 0"
    )


def downgrade() -> None:
    # No-op: dropping these would discard customer reviews and applied discounts.
    pass
