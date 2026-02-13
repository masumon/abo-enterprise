"""MongoDB schemas for unstructured/log data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class TaskExecutionLog(BaseModel):
    """Log entry for task execution steps."""

    task_id: str
    step: int
    action: str
    agent_type: str
    input_data: dict[str, Any] = Field(default_factory=dict)
    output_data: dict[str, Any] = Field(default_factory=dict)
    llm_messages: list[dict[str, str]] = Field(default_factory=list)
    llm_response: str = ""
    token_usage: dict[str, int] = Field(default_factory=dict)
    duration_ms: int = 0
    status: str = "success"
    error: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentConversation(BaseModel):
    """Stores full conversation history for an agent session."""

    session_id: str
    task_id: str
    agent_id: str
    project_id: str
    messages: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CodeGenerationArtifact(BaseModel):
    """Stores generated code artifacts."""

    task_id: str
    filename: str
    language: str
    content: str
    version: int = 1
    security_scan: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SystemEvent(BaseModel):
    """System-wide events for monitoring and analytics."""

    event_type: str
    service: str
    severity: str = "info"
    message: str = ""
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
