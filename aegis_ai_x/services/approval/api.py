"""Approval service API routes."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from services.approval.workflow_engine import WorkflowEngine

router = APIRouter(prefix="/approvals")
workflow = WorkflowEngine()


class ApprovalDecisionRequest(BaseModel):
    approved: bool
    reviewer_id: str
    comment: str = ""


class CreateApprovalRequest(BaseModel):
    task_id: str
    approval_type: str
    details: dict = {}


@router.post("/")
async def create_approval(
    request: CreateApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new approval request."""
    approval = await workflow.create_approval_request(
        task_id=UUID(request.task_id),
        approval_type=request.approval_type,
        details=request.details,
        db=db,
    )
    return {
        "id": str(approval.id),
        "task_id": str(approval.task_id),
        "status": approval.status.value,
    }


@router.get("/pending")
async def list_pending(db: AsyncSession = Depends(get_db)):
    """List all pending approval requests."""
    return await workflow.get_pending_approvals(db=db)


@router.post("/{approval_id}/decide")
async def decide_approval(
    approval_id: UUID,
    request: ApprovalDecisionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject an approval request."""
    try:
        result = await workflow.process_decision(
            approval_id=approval_id,
            approved=request.approved,
            reviewer_id=UUID(request.reviewer_id),
            comment=request.comment,
            db=db,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
