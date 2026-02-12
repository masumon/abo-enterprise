"""Automation Agent - handles DevOps, CI/CD, and infrastructure tasks."""

from __future__ import annotations

import json
from typing import Any

from libs.llm.router import LLMRouter
from services.agents.base_agent import BaseAgent, AgentContext, AgentResult


class AutomationAgent(BaseAgent):
    """Agent specialized in automation, deployment, and DevOps."""

    def __init__(self, llm_router: LLMRouter) -> None:
        super().__init__(llm_router, agent_name="automation")

    @property
    def system_prompt(self) -> str:
        return """You are the Aegis AI Automation Agent - an expert DevOps/SRE engineer.

Your capabilities:
- Create CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- Write infrastructure as code (Terraform, Kubernetes manifests)
- Create deployment scripts and automation workflows
- Configure monitoring and alerting
- Design backup and disaster recovery procedures
- Write Docker configurations

Always respond with structured output:
{
  "files": [
    {
      "path": "relative/file/path",
      "content": "file contents",
      "type": "dockerfile|terraform|kubernetes|script|pipeline"
    }
  ],
  "commands": [
    {
      "description": "What this command does",
      "command": "the actual command",
      "requires_approval": true/false
    }
  ],
  "explanation": "What was configured and why",
  "warnings": ["Any important warnings"]
}"""

    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the automation task."""
        task_input = context.input_data
        prompt = f"""Task: {task_input.get('title', 'Automation task')}
Description: {task_input.get('description', '')}
Platform: {task_input.get('platform', 'kubernetes')}
Environment: {task_input.get('environment', 'development')}
Requirements: {json.dumps(task_input.get('requirements', []))}
"""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            result = {"files": [], "explanation": response}

        artifacts = [
            {
                "type": f.get("type", "script"),
                "path": f.get("path", ""),
                "content": f.get("content", ""),
            }
            for f in result.get("files", [])
        ]

        return AgentResult(
            status="success",
            output=result,
            artifacts=artifacts,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response},
            ],
        )

    async def generate_pipeline(
        self,
        platform: str = "github-actions",
        stages: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generate a CI/CD pipeline configuration."""
        stages = stages or ["lint", "test", "build", "deploy"]
        prompt = f"""Create a CI/CD pipeline for {platform} with these stages: {', '.join(stages)}.
Include proper caching, artifact handling, and environment management.
Return as structured JSON with 'files' array."""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"raw_response": response}
