"""Agent management endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import Agent
from database.session import get_db

router = APIRouter()


class AgentCreate(BaseModel):
    project_id: str
    name: str
    agent_type: str  # planner, code, automation
    description: str = ""
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    config: dict = {}


class AgentResponse(BaseModel):
    id: str
    project_id: str
    name: str
    agent_type: str
    description: str | None
    llm_provider: str
    llm_model: str
    is_active: bool

    class Config:
        from_attributes = True


class AgentList(BaseModel):
    agents: list[AgentResponse]
    total: int


@router.post("/agents", response_model=AgentResponse, status_code=201)
async def create_agent(
    data: AgentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new agent configuration."""
    agent = Agent(
        project_id=UUID(data.project_id),
        name=data.name,
        agent_type=data.agent_type,
        description=data.description,
        llm_provider=data.llm_provider,
        llm_model=data.llm_model,
        config=data.config,
    )
    db.add(agent)
    await db.flush()

    return AgentResponse(
        id=str(agent.id),
        project_id=str(agent.project_id),
        name=agent.name,
        agent_type=agent.agent_type,
        description=agent.description,
        llm_provider=agent.llm_provider,
        llm_model=agent.llm_model,
        is_active=agent.is_active,
    )


@router.get("/agents", response_model=AgentList)
async def list_agents(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List agents, optionally filtered by project."""
    query = select(Agent).where(Agent.is_active.is_(True))
    if project_id:
        query = query.where(Agent.project_id == UUID(project_id))

    result = await db.execute(query)
    agents = result.scalars().all()

    return AgentList(
        agents=[
            AgentResponse(
                id=str(a.id),
                project_id=str(a.project_id),
                name=a.name,
                agent_type=a.agent_type,
                description=a.description,
                llm_provider=a.llm_provider,
                llm_model=a.llm_model,
                is_active=a.is_active,
            )
            for a in agents
        ],
        total=len(agents),
    )


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get an agent by ID."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(
        id=str(agent.id),
        project_id=str(agent.project_id),
        name=agent.name,
        agent_type=agent.agent_type,
        description=agent.description,
        llm_provider=agent.llm_provider,
        llm_model=agent.llm_model,
        is_active=agent.is_active,
    )


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete an agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_active = False
