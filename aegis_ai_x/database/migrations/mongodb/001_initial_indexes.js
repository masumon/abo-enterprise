// Aegis AI X - MongoDB Initial Indexes
// Migration: 001_initial_indexes
// Description: Creates collections and indexes for log/event data

// ─── Task Execution Logs ─────────────────────

db.createCollection("task_execution_logs");
db.task_execution_logs.createIndex({ task_id: 1, step: 1 });
db.task_execution_logs.createIndex({ timestamp: -1 });
db.task_execution_logs.createIndex({ agent_type: 1 });
db.task_execution_logs.createIndex({ status: 1 });
// TTL index: auto-delete logs older than 90 days
db.task_execution_logs.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// ─── Agent Conversations ─────────────────────

db.createCollection("agent_conversations");
db.agent_conversations.createIndex({ session_id: 1 }, { unique: true });
db.agent_conversations.createIndex({ task_id: 1 });
db.agent_conversations.createIndex({ agent_id: 1 });
db.agent_conversations.createIndex({ project_id: 1 });
db.agent_conversations.createIndex({ created_at: -1 });

// ─── Code Generation Artifacts ───────────────

db.createCollection("code_generation_artifacts");
db.code_generation_artifacts.createIndex({ task_id: 1 });
db.code_generation_artifacts.createIndex({ filename: 1 });
db.code_generation_artifacts.createIndex({ language: 1 });
db.code_generation_artifacts.createIndex({ created_at: -1 });

// ─── System Events ──────────────────────────

db.createCollection("system_events");
db.system_events.createIndex({ event_type: 1 });
db.system_events.createIndex({ service: 1 });
db.system_events.createIndex({ severity: 1 });
db.system_events.createIndex({ timestamp: -1 });
// TTL index: auto-delete events older than 30 days
db.system_events.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

print("MongoDB indexes created successfully.");
