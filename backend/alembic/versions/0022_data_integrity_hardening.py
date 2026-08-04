"""data_integrity_hardening — CHECK constraints, missing indexes, missing
updated_at/is_deleted columns (additive).

Mirrors ``manual_sql/0022_data_integrity_hardening.sql``. Idempotent
(IF NOT EXISTS / pg_constraint guards), so upgrading a database where that
file has already been run is a no-op, and a fresh database gets the same
changes from Alembic alone.

Additive-only; downgrade is a no-op by design (dropping a CHECK constraint
or a column is a separate, deliberate decision, not an automatic revert).

Revision ID: 0022
Revises: 0021
Create Date: 2026-08-04
"""

from typing import Sequence

from alembic import op

revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # STEP 1 — indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_revenue_transactions_order_id ON revenue_transactions(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_revenue_transactions_booking_id ON revenue_transactions(booking_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_revenue_transactions_lead_id ON revenue_transactions(lead_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_bkash_transactions_order_id ON bkash_transactions(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_bkash_transactions_booking_id ON bkash_transactions(booking_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_nagad_transactions_order_id ON nagad_transactions(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_nagad_transactions_booking_id ON nagad_transactions(booking_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)")

    # STEP 2 — CHECK constraints
    op.execute("""
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_price_nonneg') THEN
        ALTER TABLE products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonneg') THEN
        ALTER TABLE products ADD CONSTRAINT products_stock_nonneg CHECK (stock_quantity >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_range') THEN
        ALTER TABLE products ADD CONSTRAINT products_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range') THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_nonneg') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_subtotal_nonneg CHECK (subtotal >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_nonneg') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_discount_nonneg CHECK (discount_amount >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_positive') THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_subtotal_nonneg') THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_subtotal_nonneg CHECK (subtotal >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_base_price_nonneg') THEN
        ALTER TABLE services ADD CONSTRAINT services_base_price_nonneg CHECK (base_price IS NULL OR base_price >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_min_price_nonneg') THEN
        ALTER TABLE services ADD CONSTRAINT services_min_price_nonneg CHECK (min_price IS NULL OR min_price >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_max_price_nonneg') THEN
        ALTER TABLE services ADD CONSTRAINT services_max_price_nonneg CHECK (max_price IS NULL OR max_price >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_hourly_rate_nonneg') THEN
        ALTER TABLE services ADD CONSTRAINT services_hourly_rate_nonneg CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_v2_quoted_price_nonneg') THEN
        ALTER TABLE bookings_v2 ADD CONSTRAINT bookings_v2_quoted_price_nonneg CHECK (quoted_price IS NULL OR quoted_price >= 0);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_v2_final_price_nonneg') THEN
        ALTER TABLE bookings_v2 ADD CONSTRAINT bookings_v2_final_price_nonneg CHECK (final_price IS NULL OR final_price >= 0);
      END IF;
    END $$;
    """)

    # STEP 3 — updated_at (backfilled from created_at / used_at)
    for table, backfill_from in [
        ("admin_users", "created_at"),
        ("activity_logs", "created_at"),
        ("assistant_messages", "created_at"),
        ("assistant_action_logs", "created_at"),
        ("lead_form_fields", "created_at"),
        ("asset_usage", "used_at"),
        ("revenue_transactions", "created_at"),
        ("customer_interactions", "created_at"),
    ]:
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ")
        op.execute(f"UPDATE {table} SET updated_at = {backfill_from} WHERE updated_at IS NULL")

    # STEP 4 — is_deleted (default false)
    for table in [
        "reviews", "admin_users", "payment_methods", "email_templates",
        "activity_logs", "assistant_messages", "assistant_action_logs", "order_items",
    ]:
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE")


def downgrade() -> None:
    # Additive-only; leaving constraints/indexes/columns in place is safe.
    # No-op by design — see manual_sql/0022_data_integrity_hardening.sql
    # for the individually-commented rollback statements if ever needed.
    pass
