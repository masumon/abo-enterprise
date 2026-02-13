"""Supervisor Core - central brain of the Aegis AI system."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from libs.llm.router import LLMRouter
from libs.monitoring.logger import get_logger

logger = get_logger("supervisor")

SYSTEM_PROMPT = """You are the Aegis AI Supervisor - an intelligent task orchestration engine.
Your job is to analyze incoming tasks and determine:
1. Which specialized agent(s) should handle the task
2. How to break complex tasks into subtasks
3. What approval workflows are needed
4. What execution environment is required

Respond with a JSON plan containing:
{
  "analysis": "Brief analysis of the task",
  "steps": [
    {
      "agent_type": "planner|code|automation",
      "action": "Description of what this step does",
      "requires_approval": true/false,
      "execution_env": "sandbox|kubernetes|local",
      "depends_on": []
    }
  ],
  "risk_level": "low|medium|high|critical",
  "estimated_complexity": 1-10
}
"""


class SupervisorCore:
    """The Supervisor analyzes tasks and creates execution plans."""

    def __init__(self, llm_router: LLMRouter) -> None:
        self.llm = llm_router

    async def analyze_task(
        self,
        task_title: str,
        task_description: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Analyze a task and produce an execution plan."""
        user_message = f"""Task: {task_title}
Description: {task_description}
Context: {context or 'No additional context'}

Analyze this task and produce an execution plan."""

        response = await self.llm.generate(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
        )

        logger.info(
            "task_analyzed",
            task_title=task_title,
            model=response.model,
            tokens=response.usage.get("total_tokens", 0),
        )

        # Parse the plan from the LLM response
        import json

        try:
            plan = json.loads(response.content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            plan = json.loads(content.strip())

        return plan

    async def should_require_approval(
        self, plan: dict[str, Any]
    ) -> bool:
        """Determine if a plan requires human approval."""
        risk = plan.get("risk_level", "medium")
        if risk in ("high", "critical"):
            return True

        steps = plan.get("steps", [])
        for step in steps:
            if step.get("requires_approval", False):
                return True
            if step.get("execution_env") == "kubernetes":
                return True

        return False

    async def evaluate_result(
        self,
        task_title: str,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        """Evaluate the result of a completed task."""
        response = await self.llm.generate(
            messages=[
                {
                    "role": "system",
                    "content": "Evaluate the following task result. Is it complete and correct? Respond with JSON: {\"status\": \"success|partial|failed\", \"feedback\": \"...\", \"next_steps\": []}",
                },
                {
                    "role": "user",
                    "content": f"Task: {task_title}\nResult: {result}",
                },
            ],
            temperature=0.2,
        )

        import json

        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            return {"status": "unknown", "feedback": response.content, "next_steps": []}
