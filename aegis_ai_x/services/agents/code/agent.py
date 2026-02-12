"""Code Agent - generates, modifies, and reviews code."""

from __future__ import annotations

import json
from typing import Any

from libs.llm.router import LLMRouter
from libs.security.scanner import SecurityScanner
from services.agents.base_agent import BaseAgent, AgentContext, AgentResult


class CodeAgent(BaseAgent):
    """Agent specialized in code generation, modification, and review."""

    def __init__(self, llm_router: LLMRouter) -> None:
        super().__init__(llm_router, agent_name="code")
        self.security_scanner = SecurityScanner()

    @property
    def system_prompt(self) -> str:
        return """You are the Aegis AI Code Agent - an expert software developer.

Your capabilities:
- Generate production-quality code in any language
- Refactor and optimize existing code
- Debug and fix issues
- Write tests
- Review code for quality and security

Guidelines:
- Write clean, well-documented code
- Follow language-specific best practices
- Include error handling
- Consider security implications
- Generate type annotations where applicable

Always respond with structured output:
{
  "files": [
    {
      "path": "relative/file/path.py",
      "language": "python",
      "content": "file contents",
      "action": "create|modify|delete"
    }
  ],
  "explanation": "What was done and why",
  "tests": [
    {
      "path": "tests/test_file.py",
      "content": "test file contents"
    }
  ]
}"""

    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the code generation/modification task."""
        task_input = context.input_data
        prompt = f"""Task: {task_input.get('title', 'Code task')}
Description: {task_input.get('description', '')}
Language: {task_input.get('language', 'python')}
Existing code: {task_input.get('existing_code', 'None')}
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

        # Security scan generated code
        artifacts: list[dict[str, Any]] = []
        for file_info in result.get("files", []):
            code = file_info.get("content", "")
            findings = self.security_scanner.scan_code(code, file_info.get("path", ""))
            file_info["security_findings"] = [
                {
                    "rule_id": f.rule_id,
                    "severity": f.severity.value,
                    "title": f.title,
                    "suggestion": f.suggestion,
                }
                for f in findings
            ]
            artifacts.append({
                "type": "code",
                "path": file_info.get("path", ""),
                "language": file_info.get("language", ""),
                "content": code,
                "security_findings": file_info["security_findings"],
            })

        return AgentResult(
            status="success",
            output=result,
            artifacts=artifacts,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response},
            ],
        )

    async def review_code(self, code: str, language: str = "python") -> dict[str, Any]:
        """Review code for quality, security, and best practices."""
        prompt = f"""Review the following {language} code for:
1. Code quality and readability
2. Security vulnerabilities
3. Performance issues
4. Best practices adherence
5. Potential bugs

```{language}
{code}
```

Return JSON with: score (1-10), issues (list), suggestions (list), security_findings (list)."""

        response = await self.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )

        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"score": 0, "raw_review": response}
