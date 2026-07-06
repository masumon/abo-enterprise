"""DEPRECATED — runtime schema mutation has been replaced by Alembic migrations.

All column patches previously applied here are now in:
    alembic/versions/0002_schema_sync_columns.py

This module is kept for reference only.  It is no longer imported or
called from any application code.  Do NOT re-enable runtime schema sync
against production.
"""

from __future__ import annotations

import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# (table, column, SQL type + optional default)
COLUMN_PATCHES: list[tuple[str, str, str]] = [
    # products — extended catalog fields
    ("products", "seo_title", "TEXT"),
    ("products", "seo_description", "TEXT"),
    ("products", "seo_keywords", "TEXT"),
    ("products", "canonical_url", "TEXT"),
    ("products", "og_image", "TEXT"),
    ("products", "sku", "TEXT"),
    ("products", "barcode", "TEXT"),
    ("products", "brand", "TEXT"),
    ("products", "sub_category", "TEXT"),
    ("products", "tags", "JSONB DEFAULT '[]'::jsonb"),
    ("products", "weight", "NUMERIC(8,3)"),
    ("products", "warranty_info", "TEXT"),
    ("products", "delivery_info", "TEXT"),
    ("products", "is_flash_sale", "BOOLEAN DEFAULT FALSE"),
    ("products", "flash_sale_price", "NUMERIC(10,2)"),
    ("products", "flash_sale_ends_at", "TIMESTAMPTZ"),
    ("products", "low_stock_threshold", "INTEGER DEFAULT 5"),
    ("products", "is_best_seller", "BOOLEAN DEFAULT FALSE"),
    ("products", "rating", "NUMERIC(3,2)"),
    # services — SEO + detail blocks
    ("services", "seo_title", "TEXT"),
    ("services", "seo_description", "TEXT"),
    ("services", "seo_keywords", "TEXT"),
    ("services", "canonical_url", "TEXT"),
    ("services", "og_image", "TEXT"),
    ("services", "process_steps", "JSONB DEFAULT '[]'::jsonb"),
    ("services", "benefits", "JSONB DEFAULT '[]'::jsonb"),
    ("services", "requirements", "JSONB DEFAULT '[]'::jsonb"),
    ("services", "required_documents", "JSONB DEFAULT '[]'::jsonb"),
    ("services", "faq", "JSONB DEFAULT '[]'::jsonb"),
    # service booking form extras
    ("service_booking_forms", "default_value", "TEXT"),
    ("service_booking_forms", "validation_rules", "JSONB"),
    ("service_booking_forms", "conditional_logic", "JSONB"),
    # reviews — admin reply
    ("reviews", "admin_reply", "TEXT"),
    ("reviews", "admin_reply_at", "TIMESTAMPTZ"),
    # orders — checkout extensions
    ("orders", "discount_amount", "NUMERIC(10,2) DEFAULT 0"),
    ("orders", "coupon_code", "TEXT"),
    ("orders", "courier_provider", "TEXT"),
    ("orders", "courier_tracking_id", "TEXT"),
]

INDEX_PATCHES: list[str] = [
    "CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)",
]


async def sync_schema(engine: AsyncEngine) -> None:
    """Add any ORM columns that are missing from an older database."""
    applied = 0
    async with engine.begin() as conn:
        for table, column, col_type in COLUMN_PATCHES:
            stmt = text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
            )
            try:
                await conn.execute(stmt)
                applied += 1
            except Exception as exc:
                # Table may not exist yet if migrations 004+ were never run.
                logger.warning(
                    "Schema patch skipped for %s.%s: %s", table, column, exc
                )

        for idx_sql in INDEX_PATCHES:
            try:
                await conn.execute(text(idx_sql))
            except Exception as exc:
                logger.warning("Index patch skipped: %s", exc)

    logger.info("Schema sync complete (%d column patches attempted).", applied)
