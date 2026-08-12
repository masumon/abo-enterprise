-- ABO ENTERPRISE — Batch 02 Customer Master manual migration/backfill
-- Run manually in Supabase only after reviewing the target environment.
-- Idempotent: creates the canonical customer master if missing and backfills
-- one profile per phone without overwriting existing customer-master rows.
-- This script does not delete or rewrite historical orders/bookings/leads.

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    company VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS ix_customers_is_deleted ON customers(is_deleted);

WITH source_rows AS (
    SELECT
        TRIM(o.customer_phone) AS phone,
        o.customer_name AS name,
        o.customer_email AS email,
        o.company_name AS company,
        o.delivery_address AS address,
        o.created_at AS activity_at
    FROM orders o
    WHERE o.is_deleted = FALSE
      AND NULLIF(TRIM(o.customer_phone), '') IS NOT NULL

    UNION ALL

    SELECT
        TRIM(b.customer_phone) AS phone,
        b.customer_name AS name,
        b.customer_email AS email,
        b.customer_company AS company,
        NULL::TEXT AS address,
        b.created_at AS activity_at
    FROM bookings_v2 b
    WHERE b.is_deleted = FALSE
      AND NULLIF(TRIM(b.customer_phone), '') IS NOT NULL

    UNION ALL

    SELECT
        TRIM(l.phone) AS phone,
        l.name AS name,
        l.email AS email,
        l.company AS company,
        NULL::TEXT AS address,
        l.created_at AS activity_at
    FROM leads_v2 l
    WHERE l.is_deleted = FALSE
      AND NULLIF(TRIM(l.phone), '') IS NOT NULL
), ranked AS (
    SELECT
        phone,
        name,
        email,
        company,
        address,
        ROW_NUMBER() OVER (
            PARTITION BY phone
            ORDER BY activity_at DESC NULLS LAST
        ) AS rn
    FROM source_rows
)
INSERT INTO customers (phone, name, email, company, address)
SELECT phone, name, email, company, address
FROM ranked
WHERE rn = 1
ON CONFLICT (phone) DO NOTHING;

-- Review-only integrity check; no mutation.
SELECT phone, COUNT(*) AS customer_rows
FROM customers
GROUP BY phone
HAVING COUNT(*) > 1;
