"""Project management endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import Project, ProjectMember, UserRole
from database.session import get_db

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None
    is_active: bool

    class Config:
        from_attributes = True


class ProjectList(BaseModel):
    projects: list[ProjectResponse]
    total: int


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    # Check slug uniqueness
    existing = await db.execute(select(Project).where(Project.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Project slug already exists")

    project = Project(name=data.name, slug=data.slug, description=data.description)
    db.add(project)
    await db.flush()

    # Add creator as admin
    member = ProjectMember(
        project_id=project.id,
        user_id=UUID(request.state.user_id),
        role=UserRole.ADMIN,
    )
    db.add(member)

    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        slug=project.slug,
        description=project.description,
        is_active=project.is_active,
    )


@router.get("/projects", response_model=ProjectList)
async def list_projects(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """List all projects the user has access to."""
    user_id = UUID(request.state.user_id)
    result = await db.execute(
        select(Project)
        .join(ProjectMember)
        .where(ProjectMember.user_id == user_id)
        .where(Project.is_active.is_(True))
    )
    projects = result.scalars().all()
    return ProjectList(
        projects=[
            ProjectResponse(
                id=str(p.id),
                name=p.name,
                slug=p.slug,
                description=p.description,
                is_active=p.is_active,
            )
            for p in projects
        ],
        total=len(projects),
    )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        slug=project.slug,
        description=project.description,
        is_active=project.is_active,
    )


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_active = False
