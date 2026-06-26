from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, lead_notification_html
from app.models.models import Lead
from app.schemas.schemas import LeadCreate, LeadOut, LeadStatusUpdate, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("", response_model=ApiResponse, status_code=201)
async def create_lead(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    if settings.ADMIN_NOTIFY_EMAIL:
        html = lead_notification_html(
            payload.name, payload.phone, payload.lead_type,
            payload.project_description or "", payload.budget_range or "",
        )
        background_tasks.add_task(
            send_email, settings.ADMIN_NOTIFY_EMAIL,
            f"New Lead: {payload.name} ({payload.lead_type.replace('_', ' ')}) — ABO Enterprise", html,
        )

    return ApiResponse(data=LeadOut.model_validate(lead), message="Lead submitted successfully")


@router.get("", response_model=PaginatedResponse)
async def list_leads(
    lead_type: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = [Lead.is_deleted == False]  # noqa: E712
    if lead_type:
        conditions.append(Lead.lead_type == lead_type)
    if status:
        conditions.append(Lead.status == status)

    total = (await db.execute(select(func.count(Lead.id)).where(and_(*conditions)))).scalar_one()
    result = await db.execute(
        select(Lead).where(and_(*conditions))
        .order_by(Lead.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    leads = result.scalars().all()
    return PaginatedResponse(
        data=[LeadOut.model_validate(l) for l in leads],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )


@router.get("/{lead_id}", response_model=ApiResponse)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return ApiResponse(data=LeadOut.model_validate(lead))


@router.patch("/{lead_id}/status", response_model=ApiResponse)
async def update_lead_status(
    lead_id: UUID,
    payload: LeadStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = payload.status
    return ApiResponse(data=LeadOut.model_validate(lead), message="Lead status updated")
