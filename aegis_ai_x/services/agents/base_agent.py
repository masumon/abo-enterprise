"""Base Agent - abstract foundation for all specialized agents."""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from libs.llm.router import LLMRouter
from libs.monitoring.logger import get_logger

logger = get_logger("base-agent")


@dataclass
class AgentContext:
    """Context passed to an agent for task execution."""

    task_id: str
    project_id: str = ""
    input_data: dict[str, Any] = field(default_factory=dict)
    previous_results: list[dict[str, Any]] = field(default_factory=list)
    conversation_history: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    """Result from an agent execution."""

    status: str  # success, partial, failed
    output: Any = None
    artifacts: list[dict[str, Any]] = field(default_factory=list)
    messages: list[dict[str, str]] = field(default_factory=list)
    token_usage: dict[str, int] = field(default_factory=dict)
    duration_ms: int = 0
    error: str | None = None


class BaseAgent(ABC):
    """Abstract base class for all Aegis AI agents."""

    def __init__(
        self,
        llm_router: LLMRouter,
        agent_name: str = "base-agent",
        max_iterations: int = 10,
    ) -> None:
        self.llm = llm_router
        self.agent_name = agent_name
        self.max_iterations = max_iterations

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """The system prompt that defines this agent's behavior."""
        ...

    @abstractmethod
    async def execute(self, context: AgentContext) -> AgentResult:
        """Execute the agent's task."""
        ...

    async def run(self, context: AgentContext) -> AgentResult:
        """Run the agent with logging and error handling."""
        start = time.time()
        logger.info(
            "agent_started",
            agent=self.agent_name,
            task_id=context.task_id,
        )

        try:
            result = await self.execute(context)
            result.duration_ms = int((time.time() - start) * 1000)
            logger.info(
                "agent_completed",
                agent=self.agent_name,
                task_id=context.task_id,
                status=result.status,
                duration_ms=result.duration_ms,
            )
            return result
        except Exception as e:
            duration_ms = int((time.time() - start) * 1000)
            logger.error(
                "agent_failed",
                agent=self.agent_name,
                task_id=context.task_id,
                error=str(e),
            )
            return AgentResult(
                status="failed",
                error=str(e),
                duration_ms=duration_ms,
            )

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        provider: str | None = None,
    ) -> str:
        """Send a chat message through the LLM router."""
        full_messages = [
            {"role": "system", "content": self.system_prompt},
            *messages,
        ]
        response = await self.llm.generate(
            messages=full_messages,
            temperature=temperature,
            provider=provider,
        )
        return response.content

    async def iterative_refinement(
        self,
        context: AgentContext,
        initial_prompt: str,
        refine_prompt: str = "Review your previous output. Is it complete and correct? If not, provide an improved version.",
    ) -> str:
        """Run iterative refinement loop on LLM output."""
        messages = [{"role": "user", "content": initial_prompt}]
        response = await self.chat(messages)
        messages.append({"role": "assistant", "content": response})

        for i in range(self.max_iterations - 1):
            messages.append({"role": "user", "content": refine_prompt})
            refined = await self.chat(messages, temperature=0.3)
            messages.append({"role": "assistant", "content": refined})

            if "COMPLETE" in refined or "no changes needed" in refined.lower():
                return refined

            response = refined

        return response
