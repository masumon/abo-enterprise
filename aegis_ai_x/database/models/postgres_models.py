"""SQLAlchemy models for PostgreSQL — SUMONIX AI Platform."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Enum,
    JSON,
    BigInteger,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, PyEnum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    VIEWER = "viewer"
    OPERATOR = "operator"


class TaskStatus(str, PyEnum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ApprovalStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class SubscriptionTier(str, PyEnum):
    FREE = "free"
    GO = "go"
    PRO = "pro"
    ULTRA_PRO = "ultra_pro"


class SubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class BillingCycle(str, PyEnum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


# ─── Users & Auth ─────────────────────────────


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.DEVELOPER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    oauth_provider = Column(String(50), nullable=True)
    oauth_id = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    projects = relationship("ProjectMember", back_populates="user")
    tasks = relationship("Task", back_populates="created_by_user")
    approvals = relationship("ApprovalRequest", back_populates="reviewer")
    subscription = relationship("UserSubscription", back_populates="user", uselist=False)
    conversations = relationship("Conversation", back_populates="user")
    billing_transactions = relationship("BillingTransaction", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    settings = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship("ProjectMember", back_populates="project")
    agents = relationship("Agent", back_populates="project")
    tasks = relationship("Task", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.DEVELOPER, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")


# ─── Agents ───────────────────────────────────


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    agent_type = Column(String(100), nullable=False)  # planner, code, automation
    description = Column(Text, nullable=True)
    config = Column(JSON, default=dict)
    llm_provider = Column(String(50), default="openai")
    llm_model = Column(String(100), default="gpt-4o")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="agents")
    tasks = relationship("Task", back_populates="agent")


# ─── Tasks ────────────────────────────────────


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)
    priority = Column(Integer, default=0)
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    token_usage = Column(JSON, default=dict)
    cost = Column(Float, default=0.0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="tasks")
    agent = relationship("Agent", back_populates="tasks")
    created_by_user = relationship("User", back_populates="tasks")
    approval_requests = relationship("ApprovalRequest", back_populates="task")


# ─── Approvals ────────────────────────────────


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    approval_type = Column(String(100), nullable=False)  # execution, deployment, data_access
    details = Column(JSON, default=dict)
    review_comment = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    task = relationship("Task", back_populates="approval_requests")
    reviewer = relationship("User", back_populates="approvals")


# ─── Audit Log ────────────────────────────────


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(200), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(200), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


# ─── Subscription & Billing ──────────────────


PLAN_LIMITS = {
    SubscriptionTier.FREE: {
        "messages_per_day": 20,
        "messages_per_month": 500,
        "max_tokens_per_message": 2048,
        "max_conversations": 10,
        "models": ["gpt-4o-mini"],
        "features": ["basic_chat"],
        "file_uploads": False,
        "image_generation": False,
        "code_execution": False,
        "priority_support": False,
    },
    SubscriptionTier.GO: {
        "messages_per_day": 100,
        "messages_per_month": 3000,
        "max_tokens_per_message": 4096,
        "max_conversations": 100,
        "models": ["gpt-4o-mini", "gpt-4o"],
        "features": ["basic_chat", "file_upload", "web_search"],
        "file_uploads": True,
        "image_generation": False,
        "code_execution": False,
        "priority_support": False,
    },
    SubscriptionTier.PRO: {
        "messages_per_day": 500,
        "messages_per_month": 15000,
        "max_tokens_per_message": 8192,
        "max_conversations": -1,  # unlimited
        "models": ["gpt-4o-mini", "gpt-4o", "claude-sonnet-4-5-20250929", "gemini-2.0-flash"],
        "features": ["basic_chat", "file_upload", "web_search", "image_gen", "code_exec", "agents"],
        "file_uploads": True,
        "image_generation": True,
        "code_execution": True,
        "priority_support": True,
    },
    SubscriptionTier.ULTRA_PRO: {
        "messages_per_day": -1,  # unlimited
        "messages_per_month": -1,  # unlimited
        "max_tokens_per_message": 32768,
        "max_conversations": -1,  # unlimited
        "models": ["gpt-4o-mini", "gpt-4o", "claude-sonnet-4-5-20250929", "claude-opus-4-6", "gemini-2.0-flash", "gemini-2.5-pro", "ollama"],
        "features": ["basic_chat", "file_upload", "web_search", "image_gen", "code_exec", "agents", "api_access", "custom_agents", "priority_queue"],
        "file_uploads": True,
        "image_generation": True,
        "code_execution": True,
        "priority_support": True,
    },
}

PLAN_PRICING = {
    SubscriptionTier.FREE: {"monthly": 0, "yearly": 0},
    SubscriptionTier.GO: {"monthly": 9.99, "yearly": 99.99},
    SubscriptionTier.PRO: {"monthly": 29.99, "yearly": 299.99},
    SubscriptionTier.ULTRA_PRO: {"monthly": 79.99, "yearly": 799.99},
}


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE, nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    billing_cycle = Column(Enum(BillingCycle), default=BillingCycle.MONTHLY, nullable=False)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    # Usage tracking
    messages_used_today = Column(Integer, default=0)
    messages_used_this_month = Column(Integer, default=0)
    tokens_used_this_month = Column(BigInteger, default=0)
    last_usage_reset = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscription")


class BillingTransaction(Base):
    __tablename__ = "billing_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="usd")
    description = Column(String(500), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    status = Column(String(50), default="succeeded")  # succeeded, failed, pending, refunded
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="billing_transactions")


# ─── Chat / Conversations ────────────────────


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), default="New Chat")
    model = Column(String(100), default="gpt-4o-mini")
    system_prompt = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    total_tokens = Column(BigInteger, default=0)
    message_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    model = Column(String(100), nullable=True)
    tokens_used = Column(Integer, default=0)
    finish_reason = Column(String(50), nullable=True)
    metadata = Column(JSON, default=dict)  # attachments, tool calls, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
