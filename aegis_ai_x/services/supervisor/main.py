"""Supervisor service FastAPI application."""

from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from libs.config import get_settings
from libs.llm.router import LLMRouter
from libs.llm.providers import OpenAIClient, AnthropicClient
from libs.monitoring.logger import setup_logging
from services.supervisor.core import SupervisorCore
from services.supervisor.router import TaskRouter
from services.supervisor.orchestrator import Orchestrator

settings = get_settings()
setup_logging("supervisor-service")

app = FastAPI(title="Aegis AI X - Supervisor Service", version="1.0.0")

# Initialize LLM router
llm_router = LLMRouter()
if settings.openai_api_key:
    llm_router.register(OpenAIClient(api_key=settings.openai_api_key), priority=0)
if settings.anthropic_api_key:
    llm_router.register(AnthropicClient(api_key=settings.anthropic_api_key), priority=1)

supervisor = SupervisorCore(llm_router)
task_router = TaskRouter()
orchestrator = Orchestrator(supervisor, task_router)


class AnalyzeRequest(BaseModel):
    title: str
    description: str
    context: dict = {}


class SubmitRequest(BaseModel):
    task_id: str


class ApprovalDecision(BaseModel):
    approval_id: str
    approved: bool
    reviewer_id: str
    comment: str = ""


@app.post("/supervisor/analyze")
async def analyze_task(request: AnalyzeRequest):
    """Analyze a task and return an execution plan."""
    plan = await supervisor.analyze_task(
        request.title, request.description, request.context
    )
    needs_approval = await supervisor.should_require_approval(plan)
    return {"plan": plan, "requires_approval": needs_approval}


@app.post("/supervisor/submit")
async def submit_task(
    request: SubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit a task for orchestrated execution."""
    result = await orchestrator.submit_task(UUID(request.task_id), db)
    return result


@app.post("/supervisor/approve")
async def approve_task(
    decision: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
):
    """Handle an approval decision."""
    result = await orchestrator.handle_approval(
        approval_id=UUID(decision.approval_id),
        approved=decision.approved,
        reviewer_id=UUID(decision.reviewer_id),
        comment=decision.comment,
        db=db,
    )
    return result


@app.get("/supervisor/health")
async def health():
    return {"status": "healthy", "service": "supervisor"}
