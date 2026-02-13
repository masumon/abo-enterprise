"""Task management endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.postgres_models import Task, TaskStatus
from database.session import get_db

router = APIRouter()


class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str = ""
    agent_id: str | None = None
    input_data: dict = {}
    priority: int = 0


class TaskResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None
    status: str
    priority: int
    input_data: dict
    output_data: dict | None = None
    error_message: str | None
    created_at: str

    class Config:
        from_attributes = True


class TaskList(BaseModel):
    tasks: list[TaskResponse]
    total: int


@router.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(
    data: TaskCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Create a new task for agent execution."""
    task = Task(
        project_id=UUID(data.project_id),
        agent_id=UUID(data.agent_id) if data.agent_id else None,
        created_by=UUID(request.state.user_id),
        title=data.title,
        description=data.description,
        input_data=data.input_data,
        priority=data.priority,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    await db.flush()

    return TaskResponse(
        id=str(task.id),
        project_id=str(task.project_id),
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority,
        input_data=task.input_data,
        output_data=task.output_data or {},
        error_message=task.error_message,
        created_at=task.created_at.isoformat() if task.created_at else "",
    )


@router.get("/tasks", response_model=TaskList)
async def list_tasks(
    project_id: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List tasks, optionally filtered by project or status."""
    query = select(Task)
    if project_id:
        query = query.where(Task.project_id == UUID(project_id))
    if status:
        query = query.where(Task.status == TaskStatus(status))
    query = query.order_by(Task.created_at.desc()).limit(100)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskList(
        tasks=[
            TaskResponse(
                id=str(t.id),
                project_id=str(t.project_id),
                title=t.title,
                description=t.description,
                status=t.status.value,
                priority=t.priority,
                input_data=t.input_data,
                output_data=t.output_data or {},
                error_message=t.error_message,
                created_at=t.created_at.isoformat() if t.created_at else "",
            )
            for t in tasks
        ],
        total=len(tasks),
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a task by ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(
        id=str(task.id),
        project_id=str(task.project_id),
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority,
        input_data=task.input_data,
        output_data=task.output_data or {},
        error_message=task.error_message,
        created_at=task.created_at.isoformat() if task.created_at else "",
    )


@router.post("/tasks/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending or running task."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status not in (TaskStatus.PENDING, TaskStatus.QUEUED, TaskStatus.RUNNING):
        raise HTTPException(status_code=400, detail="Task cannot be cancelled in current state")

    task.status = TaskStatus.CANCELLED
    return TaskResponse(
        id=str(task.id),
        project_id=str(task.project_id),
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority,
        input_data=task.input_data,
        output_data=task.output_data or {},
        error_message=task.error_message,
        created_at=task.created_at.isoformat() if task.created_at else "",
    )
