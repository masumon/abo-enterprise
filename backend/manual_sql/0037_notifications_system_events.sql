-- 0037_notifications_system_events.sql
-- Manual Supabase migration for Render Free Tier.
-- SAFETY: purely additive. Creates two new tables only, no ALTER/DROP/DELETE
-- on any existing table.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    body TEXT,
    target_admin_id UUID REFERENCES admin_users(id),
    link VARCHAR(500),
    meta JSON NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS ix_notifications_target_admin_id ON notifications(target_admin_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at);

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'error',
    source VARCHAR(100) NOT NULL DEFAULT 'app',
    message TEXT NOT NULL,
    meta JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_system_events_event_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS ix_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS ix_system_events_created_at ON system_events(created_at);

COMMIT;
