"""Planner Agent - designs architectures and breaks down complex tasks."""

from __future__ import annotations

import json
from typing import Any

from libs.llm.router import LLMRouter
from services.agents.base_agent import BaseAgent, AgentContext, AgentResult


class PlannerAgent(BaseAgent):
    """Agent specialized in planning, architecture, and task decomposition."""

    def __init__(self, llm_router: LLMRouter) -> None:
        super().__init__(llm_router, agent_name="planner")

    @property
    def system_prompt(self) -> str:
        return """You are the Aegis AI Planner Agent - an expert software architect and project planner.

Your capabilities:
- Break down complex tasks into actionable subtasks
- Design system architectures and data models
- Create implementation roadmaps
- Identify risks and dependencies
- Suggest technology choices

Always respond with structured JSON output:
{
  "plan": {
    "title": "Plan title",
    "overview": "Brief overview",
    "tasks": [
      {
        "id": 1,
        "title": "Task title",
        "description": "Detailed description",
        "agent_type": "code|automation|planner",
        "priority": "high|medium|low",
        "dependencies": [],
        "estimated_effort": "small|medium|large"
      }
    ],
    "architecture": {
      "components": [],
      "data_flow": "",
      "technology_stack": []
    },
    "risks": [],
    "recommendations": []
  }
}"""

    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the planning task."""
        task_input = context.input_data
        prompt = f"""Please create a detailed plan for the following:

Task: {task_input.get('title', 'Untitled')}
Description: {task_input.get('description', 'No description')}
Requirements: {json.dumps(task_input.get('requirements', []))}
Constraints: {json.dumps(task_input.get('constraints', []))}

Previous context: {json.dumps(context.previous_results) if context.previous_results else 'None'}
"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"raw_response": response}

        return AgentResult(
            status="success",
            output=plan,
            artifacts=[{"type": "plan", "content": plan}],
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response},
            ],
        )

    async def decompose_task(
        self, title: str, description: str
    ) -> list[dict[str, Any]]:
        """Break a complex task into subtasks."""
        prompt = f"""Break down this task into specific, actionable subtasks:

Task: {title}
Description: {description}

Return a JSON array of subtasks, each with: title, description, agent_type, priority, dependencies."""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return [{"title": title, "description": description, "agent_type": "code", "priority": "medium", "dependencies": []}]
