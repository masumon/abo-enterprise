"""Agent service FastAPI application."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from libs.config import get_settings
from libs.llm.router import LLMRouter
from libs.llm.providers import OpenAIClient, AnthropicClient
from libs.monitoring.logger import setup_logging
from services.agents.base_agent import AgentContext
from services.agents.planner.agent import PlannerAgent
from services.agents.code.agent import CodeAgent
from services.agents.automation.agent import AutomationAgent

settings = get_settings()
setup_logging("agents-service")

app = FastAPI(title="Aegis AI X - Agent Service", version="1.0.0")

# Initialize LLM router
llm_router = LLMRouter()
if settings.openai_api_key:
    llm_router.register(OpenAIClient(api_key=settings.openai_api_key), priority=0)
if settings.anthropic_api_key:
    llm_router.register(AnthropicClient(api_key=settings.anthropic_api_key), priority=1)

# Initialize agents
agents = {
    "planner": PlannerAgent(llm_router),
    "code": CodeAgent(llm_router),
    "automation": AutomationAgent(llm_router),
}


class ExecuteRequest(BaseModel):
    agent_type: str
    task_id: str
    project_id: str = ""
    input_data: dict = {}
    previous_results: list = []


class ReviewRequest(BaseModel):
    code: str
    language: str = "python"


@app.post("/agents/execute")
async def execute_agent(request: ExecuteRequest):
    """Execute a task with the specified agent."""
    agent = agents.get(request.agent_type)
    if not agent:
        return {"error": f"Unknown agent type: {request.agent_type}"}

    context = AgentContext(
        task_id=request.task_id,
        project_id=request.project_id,
        input_data=request.input_data,
        previous_results=request.previous_results,
    )

    result = await agent.run(context)
    return {
        "status": result.status,
        "output": result.output,
        "artifacts": result.artifacts,
        "token_usage": result.token_usage,
        "duration_ms": result.duration_ms,
        "error": result.error,
    }


@app.post("/agents/code/review")
async def review_code(request: ReviewRequest):
    """Review code for quality and security."""
    code_agent: CodeAgent = agents["code"]  # type: ignore[assignment]
    return await code_agent.review_code(request.code, request.language)


@app.get("/agents/types")
async def list_agent_types():
    """List available agent types."""
    return {
        "agents": [
            {"type": "planner", "description": "Planning and architecture tasks"},
            {"type": "code", "description": "Code generation and modification"},
            {"type": "automation", "description": "DevOps and automation tasks"},
        ]
    }


@app.get("/agents/health")
async def health():
    return {"status": "healthy", "service": "agents"}
