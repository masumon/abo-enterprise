-- Enterprise Automation Assistant tables
-- Run after existing migrations (010)

CREATE TABLE IF NOT EXISTS assistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    last_intent VARCHAR(50),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_phone ON assistant_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated ON assistant_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation ON assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created ON assistant_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS assistant_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64),
    intent VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    details JSONB DEFAULT '{}',
    admin_id UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_action_logs_session ON assistant_action_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_action_logs_created ON assistant_action_logs(created_at DESC);

-- Feature flag for assistant chat (disabled by default for safe rollout)
INSERT INTO settings (key, value, data_type, description, is_editable)
VALUES ('feature_assistant_chat', 'true', 'boolean', 'Enable enterprise automation assistant chat widget', true)
ON CONFLICT (key) DO NOTHING;
