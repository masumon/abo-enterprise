"""Orchestrator - manages the full lifecycle of task execution."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import Task, TaskStatus, ApprovalRequest, ApprovalStatus
from libs.monitoring.logger import get_logger
from services.supervisor.core import SupervisorCore
from services.supervisor.router import TaskRouter

logger = get_logger("orchestrator")


class Orchestrator:
    """Manages the full lifecycle of task execution across agents."""

    def __init__(
        self,
        supervisor: SupervisorCore,
        router: TaskRouter,
    ) -> None:
        self.supervisor = supervisor
        self.router = router
        self._running_tasks: dict[str, asyncio.Task] = {}

    async def submit_task(self, task_id: UUID, db: AsyncSession) -> dict[str, Any]:
        """Submit a task for orchestrated execution."""
        result = await db.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError(f"Task {task_id} not found")

        # Step 1: Analyze with Supervisor
        task.status = TaskStatus.QUEUED
        await db.commit()

        plan = await self.supervisor.analyze_task(
            task_title=task.title,
            task_description=task.description or "",
            context=task.input_data,
        )

        logger.info("task_plan_created", task_id=str(task_id), plan=plan)

        # Step 2: Check if approval is needed
        needs_approval = await self.supervisor.should_require_approval(plan)

        if needs_approval:
            task.status = TaskStatus.AWAITING_APPROVAL
            approval = ApprovalRequest(
                task_id=task.id,
                approval_type="execution",
                details={"plan": plan},
            )
            db.add(approval)
            await db.commit()
            logger.info("task_awaiting_approval", task_id=str(task_id))
            return {"status": "awaiting_approval", "plan": plan}

        # Step 3: Execute the plan
        return await self._execute_plan(task, plan, db)

    async def _execute_plan(
        self, task: Task, plan: dict[str, Any], db: AsyncSession
    ) -> dict[str, Any]:
        """Execute an approved plan."""
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now(timezone.utc)
        await db.commit()

        steps = self.router.route_from_plan(plan)
        results: list[dict[str, Any]] = []

        try:
            for step in steps:
                # Check dependencies
                depends_on = step.get("depends_on", [])
                for dep_idx in depends_on:
                    if dep_idx >= len(results):
                        raise RuntimeError(f"Dependency step {dep_idx} has not completed")

                logger.info(
                    "executing_step",
                    task_id=str(task.id),
                    step=step["step_index"],
                    agent=step["agent_type"],
                )

                # Dispatch to the agent (this would call the agents service)
                step_result = await self._dispatch_to_agent(
                    agent_type=step["agent_type"],
                    action=step["action"],
                    context={
                        "task_id": str(task.id),
                        "previous_results": results,
                        "input_data": task.input_data,
                    },
                )
                results.append(step_result)

            # All steps completed
            task.status = TaskStatus.COMPLETED
            task.output_data = {"steps": results, "plan": plan}
            task.completed_at = datetime.now(timezone.utc)
            await db.commit()

            # Evaluate the result
            evaluation = await self.supervisor.evaluate_result(task.title, task.output_data)
            logger.info("task_completed", task_id=str(task.id), evaluation=evaluation)

            return {"status": "completed", "results": results, "evaluation": evaluation}

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.completed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.error("task_failed", task_id=str(task.id), error=str(e))
            return {"status": "failed", "error": str(e)}

    async def _dispatch_to_agent(
        self,
        agent_type: str,
        action: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """Dispatch work to an agent service (via HTTP or message queue)."""
        # In production, this would make an HTTP call or publish to a message queue
        # For now, return a placeholder
        logger.info(
            "dispatching_to_agent",
            agent_type=agent_type,
            action=action,
        )

        return {
            "agent_type": agent_type,
            "action": action,
            "status": "completed",
            "output": f"Agent '{agent_type}' completed: {action}",
        }

    async def handle_approval(
        self,
        approval_id: UUID,
        approved: bool,
        reviewer_id: UUID,
        comment: str,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Handle an approval decision."""
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
        )
        approval = result.scalar_one_or_none()
        if not approval:
            raise ValueError("Approval request not found")

        approval.reviewer_id = reviewer_id
        approval.review_comment = comment
        approval.reviewed_at = datetime.now(timezone.utc)

        if approved:
            approval.status = ApprovalStatus.APPROVED
            task_result = await db.execute(select(Task).where(Task.id == approval.task_id))
            task = task_result.scalar_one()
            plan = approval.details.get("plan", {})
            await db.commit()
            return await self._execute_plan(task, plan, db)
        else:
            approval.status = ApprovalStatus.REJECTED
            task_result = await db.execute(select(Task).where(Task.id == approval.task_id))
            task = task_result.scalar_one()
            task.status = TaskStatus.REJECTED
            await db.commit()
            return {"status": "rejected", "comment": comment}
