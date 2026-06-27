"""
Idempotent column-level migrations for existing tables.

`create_all()` only creates tables from scratch — it never ALTER-s existing ones.
This module bridges that gap: each entry is `ALTER TABLE IF EXISTS ... ADD COLUMN
IF NOT EXISTS ...`, so it is safe to run on every startup whether the column
already exists or not.

Add a new entry here whenever a new nullable column is added to a model.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# (table_name, column_name, column_definition)
# column_definition must be valid PostgreSQL DDL (type + optional DEFAULT).
_COLUMNS: list[tuple[str, str, str]] = [
    # ── products (Sprint A: SEO) ──────────────────────────────────────
    ("products", "seo_title",       "VARCHAR(255)"),
    ("products", "seo_description", "TEXT"),
    ("products", "seo_keywords",    "VARCHAR(500)"),
    ("products", "canonical_url",   "VARCHAR(500)"),
    ("products", "og_image",        "TEXT"),

    # ── products (Sprint D: extended fields) ──────────────────────────
    ("products", "sku",                  "VARCHAR(100)"),
    ("products", "barcode",              "VARCHAR(100)"),
    ("products", "brand",                "VARCHAR(100)"),
    ("products", "sub_category",         "VARCHAR(100)"),
    ("products", "tags",                 "JSONB DEFAULT '[]'::jsonb"),
    ("products", "weight",               "NUMERIC(8, 3)"),
    ("products", "warranty_info",        "TEXT"),
    ("products", "delivery_info",        "TEXT"),
    ("products", "is_flash_sale",        "BOOLEAN DEFAULT FALSE"),
    ("products", "flash_sale_price",     "NUMERIC(10, 2)"),
    ("products", "flash_sale_ends_at",   "TIMESTAMPTZ"),
    ("products", "low_stock_threshold",  "INTEGER DEFAULT 5"),
    ("products", "is_best_seller",       "BOOLEAN DEFAULT FALSE"),

    # ── reviews (Sprint F: moderation + admin reply) ─────────────────
    ("reviews", "is_active",      "BOOLEAN DEFAULT TRUE"),
    ("reviews", "updated_at",     "TIMESTAMPTZ DEFAULT now()"),
    ("reviews", "admin_reply",    "TEXT"),
    ("reviews", "admin_reply_at", "TIMESTAMPTZ"),

    # ── services (may be missing if added after initial table creation)
    ("services", "lead_qualification_score", "INTEGER DEFAULT 0"),
    ("services", "tags",                     "JSONB DEFAULT '[]'::jsonb"),

    # ── services (Sprint A: SEO) ──────────────────────────────────────
    ("services", "seo_title",       "VARCHAR(255)"),
    ("services", "seo_description", "TEXT"),
    ("services", "seo_keywords",    "VARCHAR(500)"),
    ("services", "canonical_url",   "VARCHAR(500)"),
    ("services", "og_image",        "TEXT"),

    # ── services (Sprint E: extended content) ────────────────────────
    ("services", "process_steps",      "JSONB DEFAULT '[]'::jsonb"),
    ("services", "benefits",           "JSONB DEFAULT '[]'::jsonb"),
    ("services", "requirements",       "JSONB DEFAULT '[]'::jsonb"),
    ("services", "required_documents", "JSONB DEFAULT '[]'::jsonb"),
    ("services", "faq",                "JSONB DEFAULT '[]'::jsonb"),

    # ── service_booking_forms (Sprint G: form builder) ───────────────
    ("service_booking_forms", "default_value",    "TEXT"),
    ("service_booking_forms", "validation_rules", "JSONB"),
    ("service_booking_forms", "conditional_logic","JSONB"),

    # ── blog_posts (Sprint A: SEO) ────────────────────────────────────
    ("blog_posts", "seo_title",       "VARCHAR(255)"),
    ("blog_posts", "seo_description", "TEXT"),
    ("blog_posts", "seo_keywords",    "VARCHAR(500)"),
    ("blog_posts", "canonical_url",   "VARCHAR(500)"),
    ("blog_posts", "og_image",        "TEXT"),
]


async def run_column_migrations(engine: AsyncEngine) -> None:
    """Add any missing columns to existing tables. Safe to run on every boot."""
    from sqlalchemy import text
    added = 0
    errors = 0

    for table, column, definition in _COLUMNS:
        sql = (
            f"ALTER TABLE IF EXISTS {table} "
            f"ADD COLUMN IF NOT EXISTS {column} {definition};"
        )
        try:
            # Each column gets its own transaction so one failure cannot
            # abort the rest (PostgreSQL aborts the whole txn on error).
            async with engine.begin() as conn:
                await conn.execute(text(sql))
            added += 1
        except Exception as exc:
            logger.warning("Migration skipped %s.%s: %s", table, column, exc)
            errors += 1

    logger.info(
        "Column migrations complete — %d applied, %d errors",
        added, errors,
    )
