"""Approval workflow engine for task execution governance."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import (
    ApprovalRequest,
    ApprovalStatus,
    Task,
    TaskStatus,
    User,
    UserRole,
)
from libs.monitoring.logger import get_logger

logger = get_logger("workflow-engine")


class ApprovalPolicy:
    """Defines when approval is required and who can approve."""

    # Task types that always require approval
    ALWAYS_REQUIRE = {"deployment", "data_migration", "infrastructure_change"}

    # Risk levels that require approval
    RISK_THRESHOLD = {"high", "critical"}

    @staticmethod
    def requires_approval(
        task_type: str,
        risk_level: str,
        execution_env: str,
    ) -> bool:
        """Determine if a task requires approval."""
        if task_type in ApprovalPolicy.ALWAYS_REQUIRE:
            return True
        if risk_level in ApprovalPolicy.RISK_THRESHOLD:
            return True
        if execution_env == "kubernetes":
            return True
        return False

    @staticmethod
    def get_required_approvers(
        task_type: str,
        risk_level: str,
    ) -> list[UserRole]:
        """Get the roles required to approve a task."""
        if risk_level == "critical":
            return [UserRole.ADMIN]
        if task_type in ("deployment", "infrastructure_change"):
            return [UserRole.ADMIN, UserRole.OPERATOR]
        return [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.OPERATOR]


class WorkflowEngine:
    """Manages approval workflows for task execution."""

    def __init__(self, expiry_hours: int = 24) -> None:
        self.policy = ApprovalPolicy()
        self.expiry_hours = expiry_hours

    async def create_approval_request(
        self,
        task_id: UUID,
        approval_type: str,
        details: dict[str, Any],
        db: AsyncSession,
    ) -> ApprovalRequest:
        """Create a new approval request for a task."""
        expires_at = datetime.now(timezone.utc) + timedelta(hours=self.expiry_hours)

        approval = ApprovalRequest(
            task_id=task_id,
            approval_type=approval_type,
            details=details,
            expires_at=expires_at,
        )
        db.add(approval)

        # Update task status
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if task:
            task.status = TaskStatus.AWAITING_APPROVAL

        await db.flush()
        logger.info("approval_request_created", task_id=str(task_id), type=approval_type)
        return approval

    async def process_decision(
        self,
        approval_id: UUID,
        approved: bool,
        reviewer_id: UUID,
        comment: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Process an approval decision."""
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
        )
        approval = result.scalar_one_or_none()
        if not approval:
            raise ValueError("Approval request not found")

        if approval.status != ApprovalStatus.PENDING:
            raise ValueError(f"Approval already processed: {approval.status.value}")

        # Check expiry
        if approval.expires_at and datetime.now(timezone.utc) > approval.expires_at:
            approval.status = ApprovalStatus.EXPIRED
            await db.flush()
            raise ValueError("Approval request has expired")

        # Check reviewer authorization
        reviewer_result = await db.execute(select(User).where(User.id == reviewer_id))
        reviewer = reviewer_result.scalar_one_or_none()
        if not reviewer:
            raise ValueError("Reviewer not found")

        risk_level = approval.details.get("plan", {}).get("risk_level", "medium")
        required_roles = self.policy.get_required_approvers(
            approval.approval_type, risk_level
        )
        if reviewer.role not in required_roles:
            raise ValueError(f"User role '{reviewer.role.value}' cannot approve this request")

        # Process decision
        approval.reviewer_id = reviewer_id
        approval.review_comment = comment
        approval.reviewed_at = datetime.now(timezone.utc)

        if approved:
            approval.status = ApprovalStatus.APPROVED
            # Update task status
            task_result = await db.execute(select(Task).where(Task.id == approval.task_id))
            task = task_result.scalar_one_or_none()
            if task:
                task.status = TaskStatus.APPROVED

            logger.info("approval_granted", approval_id=str(approval_id))
            return {"status": "approved", "task_id": str(approval.task_id)}
        else:
            approval.status = ApprovalStatus.REJECTED
            task_result = await db.execute(select(Task).where(Task.id == approval.task_id))
            task = task_result.scalar_one_or_none()
            if task:
                task.status = TaskStatus.REJECTED

            logger.info("approval_rejected", approval_id=str(approval_id))
            return {"status": "rejected", "task_id": str(approval.task_id), "reason": comment}

    async def get_pending_approvals(
        self,
        reviewer_id: UUID | None = None,
        db: AsyncSession | None = None,
    ) -> list[dict[str, Any]]:
        """Get all pending approval requests."""
        if not db:
            return []

        query = select(ApprovalRequest).where(
            ApprovalRequest.status == ApprovalStatus.PENDING
        )
        result = await db.execute(query)
        approvals = result.scalars().all()

        return [
            {
                "id": str(a.id),
                "task_id": str(a.task_id),
                "approval_type": a.approval_type,
                "details": a.details,
                "requested_at": a.requested_at.isoformat() if a.requested_at else "",
                "expires_at": a.expires_at.isoformat() if a.expires_at else "",
            }
            for a in approvals
        ]
