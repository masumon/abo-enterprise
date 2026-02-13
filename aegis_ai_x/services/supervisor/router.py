"""Task Router - routes tasks to appropriate agents."""

from __future__ import annotations

from typing import Any

from libs.monitoring.logger import get_logger

logger = get_logger("task-router")


class TaskRouter:
    """Routes tasks to the appropriate agent based on the execution plan."""

    # Agent type capabilities mapping
    AGENT_CAPABILITIES = {
        "planner": {
            "keywords": ["plan", "design", "architect", "strategy", "analyze", "breakdown"],
            "description": "Planning and architectural design tasks",
        },
        "code": {
            "keywords": ["code", "implement", "build", "develop", "fix", "refactor", "debug"],
            "description": "Code generation, modification, and debugging",
        },
        "automation": {
            "keywords": ["automate", "deploy", "pipeline", "ci/cd", "script", "workflow", "test"],
            "description": "Automation, deployment, and DevOps tasks",
        },
    }

    def route_task(self, task_title: str, task_description: str) -> str:
        """Determine which agent type should handle a task."""
        combined = f"{task_title} {task_description}".lower()

        scores: dict[str, int] = {}
        for agent_type, config in self.AGENT_CAPABILITIES.items():
            score = sum(1 for kw in config["keywords"] if kw in combined)
            scores[agent_type] = score

        best_agent = max(scores, key=scores.get)  # type: ignore[arg-type]

        logger.info(
            "task_routed",
            task_title=task_title,
            agent_type=best_agent,
            scores=scores,
        )

        return best_agent

    def route_from_plan(self, plan: dict[str, Any]) -> list[dict[str, Any]]:
        """Route tasks based on supervisor's execution plan."""
        routed_steps: list[dict[str, Any]] = []

        for i, step in enumerate(plan.get("steps", [])):
            agent_type = step.get("agent_type", "code")
            routed_steps.append({
                "step_index": i,
                "agent_type": agent_type,
                "action": step.get("action", ""),
                "requires_approval": step.get("requires_approval", False),
                "execution_env": step.get("execution_env", "sandbox"),
                "depends_on": step.get("depends_on", []),
            })

        return routed_steps
