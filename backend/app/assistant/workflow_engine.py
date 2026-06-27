"""Workflow definitions for order, booking, lead, invoice, courier, and notification flows."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class WorkflowType(str, Enum):
    ORDER = "order"
    BOOKING = "booking"
    LEAD = "lead"
    INVOICE = "invoice"
    COURIER = "courier"
    NOTIFICATION = "notification"


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    EXECUTED = "executed"
    FAILED = "failed"
    BLOCKED = "blocked"


@dataclass
class WorkflowStep:
    name: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    detail: str | None = None


@dataclass
class WorkflowResult:
    workflow_type: WorkflowType
    status: WorkflowStatus
    steps: list[WorkflowStep] = field(default_factory=list)
    reference: str | None = None
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class WorkflowEngine:
    """Orchestrates multi-step workflows with explicit step tracking."""

    def create_workflow(self, workflow_type: WorkflowType) -> WorkflowResult:
        steps = [
            WorkflowStep("validate_input"),
            WorkflowStep("check_permissions"),
            WorkflowStep("apply_business_rules"),
            WorkflowStep("execute_action"),
            WorkflowStep("notify"),
        ]
        return WorkflowResult(workflow_type=workflow_type, status=WorkflowStatus.PENDING, steps=steps)

    def mark_step(self, result: WorkflowResult, step_name: str, status: WorkflowStatus, detail: str | None = None) -> None:
        for step in result.steps:
            if step.name == step_name:
                step.status = status
                step.detail = detail
                break

    def finalize(self, result: WorkflowResult, status: WorkflowStatus, reference: str | None = None, error: str | None = None) -> WorkflowResult:
        result.status = status
        result.reference = reference
        result.error = error
        return result
