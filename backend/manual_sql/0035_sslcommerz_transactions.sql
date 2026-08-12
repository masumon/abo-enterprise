-- 0035_sslcommerz_transactions.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: purely additive. Creates a new table only, no ALTER/DROP/DELETE
-- on any existing table.
-- Mirrors bkash_transactions / nagad_transactions so the new SSLCommerz IPN
-- callback (POST /api/v1/payments/webhook/sslcommerz) has somewhere to
-- record and verify each payment session against.

BEGIN;

CREATE TABLE IF NOT EXISTS sslcommerz_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    booking_id UUID REFERENCES bookings_v2(id),
    tran_id VARCHAR(50) NOT NULL UNIQUE,
    val_id VARCHAR(100),
    bank_tran_id VARCHAR(100),
    card_type VARCHAR(50),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    status VARCHAR(20) NOT NULL,
    status_message TEXT,
    webhook_received BOOLEAN NOT NULL DEFAULT FALSE,
    webhook_timestamp TIMESTAMPTZ,
    raw_response JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_sslcommerz_transactions_tran_id ON sslcommerz_transactions(tran_id);
CREATE INDEX IF NOT EXISTS ix_sslcommerz_transactions_status ON sslcommerz_transactions(status);

COMMIT;
