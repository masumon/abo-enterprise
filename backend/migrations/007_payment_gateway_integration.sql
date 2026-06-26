-- Migration 007: Payment Gateway Integration (bKash & Nagad)

CREATE TABLE IF NOT EXISTS bkash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings_v2(id) ON DELETE CASCADE,
    bkash_transaction_id VARCHAR(50) UNIQUE NOT NULL,
    payment_id VARCHAR(50) UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    payer_reference VARCHAR(255),
    merchant_invoice_number VARCHAR(50),
    status VARCHAR(20) NOT NULL,
    status_message TEXT,
    payment_execute_time TIMESTAMP WITH TIME ZONE,
    webhook_received BOOLEAN DEFAULT FALSE,
    webhook_timestamp TIMESTAMP WITH TIME ZONE,
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT bkash_transaction_id_idx UNIQUE (bkash_transaction_id),
    CONSTRAINT bkash_status_idx CHECK (status IN ('Initiated', 'Pending', 'Completed', 'Failed', 'Cancelled'))
);

CREATE INDEX idx_bkash_order_id ON bkash_transactions(order_id);
CREATE INDEX idx_bkash_booking_id ON bkash_transactions(booking_id);
CREATE INDEX idx_bkash_status ON bkash_transactions(status);
CREATE INDEX idx_bkash_created_at ON bkash_transactions(created_at);


CREATE TABLE IF NOT EXISTS nagad_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings_v2(id) ON DELETE CASCADE,
    nagad_reference_id VARCHAR(50) UNIQUE NOT NULL,
    merchant_order_id VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    customer_number VARCHAR(20),
    merchant_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    status_message TEXT,
    settlement_status VARCHAR(20),
    payment_completion_time TIMESTAMP WITH TIME ZONE,
    webhook_received BOOLEAN DEFAULT FALSE,
    webhook_timestamp TIMESTAMP WITH TIME ZONE,
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT nagad_reference_id_idx UNIQUE (nagad_reference_id),
    CONSTRAINT nagad_status_idx CHECK (status IN ('Initiated', 'Pending', 'Completed', 'Failed', 'Cancelled'))
);

CREATE INDEX idx_nagad_order_id ON nagad_transactions(order_id);
CREATE INDEX idx_nagad_booking_id ON nagad_transactions(booking_id);
CREATE INDEX idx_nagad_status ON nagad_transactions(status);
CREATE INDEX idx_nagad_created_at ON nagad_transactions(created_at);


CREATE TABLE IF NOT EXISTS payment_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_gateway VARCHAR(20) NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    discrepancies JSONB DEFAULT '[]'::jsonb,
    reconciliation_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    processed_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT reconciliation_status_idx CHECK (reconciliation_status IN ('pending', 'in_progress', 'completed', 'failed'))
);

CREATE INDEX idx_reconciliation_date ON payment_reconciliation(reconciliation_date);
CREATE INDEX idx_reconciliation_gateway ON payment_reconciliation(payment_gateway);
CREATE INDEX idx_reconciliation_status ON payment_reconciliation(reconciliation_status);

-- Seed bKash and Nagad payment methods if not exists
INSERT INTO payment_methods (id, payment_gateway, is_active, commission_percentage, min_amount, max_amount, description)
VALUES 
    (gen_random_uuid(), 'bkash', true, 0.5, 10, 1000000, 'bKash - Mobile Banking'),
    (gen_random_uuid(), 'nagad', true, 0.5, 10, 1000000, 'Nagad - Mobile Payment')
ON CONFLICT DO NOTHING;
