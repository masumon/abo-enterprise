-- Migration 008: Analytics, RBAC, Bulk Operations

-- Role-based access control
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    user_id UUID REFERENCES admin_users(id),
    session_id VARCHAR(100),
    page_url TEXT,
    referrer TEXT,
    device_type VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Bangladesh',
    metadata JSONB DEFAULT '{}'::jsonb,
    revenue NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_date ON analytics_events(created_at);
CREATE INDEX idx_analytics_entity ON analytics_events(entity_type, entity_id);

-- Daily revenue summary (pre-aggregated for performance)
CREATE TABLE IF NOT EXISTS revenue_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    orders_count INTEGER DEFAULT 0,
    orders_revenue NUMERIC(12,2) DEFAULT 0,
    bookings_count INTEGER DEFAULT 0,
    bookings_revenue NUMERIC(12,2) DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bulk operation logs
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    file_url TEXT,
    result_file_url TEXT,
    errors JSONB DEFAULT '[]'::jsonb,
    initiated_by UUID REFERENCES admin_users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI lead scoring history
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads_v2(id),
    previous_score INTEGER,
    new_score INTEGER,
    score_factors JSONB DEFAULT '{}'::jsonb,
    model_version VARCHAR(20) DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_score_lead ON lead_score_history(lead_id);
