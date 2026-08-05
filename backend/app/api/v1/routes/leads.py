from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.core.database import get_db
from app.core.security import require_role
from app.core.email import send_email, lead_notification_html
from app.models.models import Lead, ActivityLog
from app.schemas.schemas import LeadCreate, LeadOut, LeadStatusUpdate, ApiResponse, PaginatedResponse, PaginatedMeta
from app.core.rate_limit import rate_limit
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["leads"])

# LEGACY — every current public lead-capture surface (contact page, homepage
# LeadCapture, project inquiry form, B2B quotation form) posts to leads_v2
# (serviceLeadsApi.create in the frontend), which has qualification scoring,
# assignment and audit logging that this v1 table never gained. Confirmed by
# a full-repo search: no frontend code calls this POST endpoint anymore.
#
# It is kept live (not removed) only because an external integration outside
# this repo could still be posting here directly — the warning log below
# will show up in Admin → Ops if that's ever actually true, which should
# decide whether it's safe to retire. The `leads` table/admin tab otherwise
# stays as a read/update archive for whatever it already collected, the same
# pattern already used for the legacy `bookings` table.
@router.post("", response_model=ApiResponse, status_code=201, dependencies=[Depends(rate_limit("leads_create", 10, 600))])
async def create_lead(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # logger.error (not .warning) deliberately — only ERROR+ is captured into
    # the Admin -> Ops "Errors" feed (app/core/ops_events.py), and that
    # visibility is the entire point of this line.
    logger.error(
        "Legacy leads v1 create endpoint hit (phone=%s) — no known frontend caller; "
        "verify no other client still depends on it before retiring.",
        payload.phone,
    )
    lead = Lead(**payload.model_dump())
    db.add(lead)
    await db.flush()
    await db.refresh(lead)

    from app.core.email_config import resolve_notify_email
    _notify_to = await resolve_notify_email(db)
    if _notify_to:
        html = lead_notification_html(
            payload.name, payload.phone, payload.lead_type,
            payload.project_description or "", payload.budget_range or "",
        )
        background_tasks.add_task(
            send_email, _notify_to,
            f"New Lead: {payload.name} ({payload.lead_type.replace('_', ' ')}) — ABO Enterprise", html,
        )

    return ApiResponse(data=LeadOut.model_validate(lead), message="Lead submitted successfully")


@router.get("", response_model=PaginatedResponse)
async def list_leads(
    lead_type: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("leads.read")),
):
    conditions = [Lead.is_deleted == False]  # noqa: E712
    if lead_type:
        conditions.append(Lead.lead_type == lead_type)
    if status:
        conditions.append(Lead.status == status)
    if search:
        q = f"%{search}%"
        conditions.append(or_(
            Lead.name.ilike(q),
            Lead.phone.ilike(q),
            Lead.email.ilike(q),
            Lead.company.ilike(q),
        ))

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
    _admin: str = Depends(require_role("leads.read")),
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
    _admin: str = Depends(require_role("leads.write")),
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    old_status = lead.status
    lead.status = payload.status
    db.add(ActivityLog(
        admin_id=UUID(_admin), action="update",
        entity_type="lead", entity_id=lead.id,
        old_values={"status": old_status}, new_values={"status": payload.status},
    ))
    return ApiResponse(data=LeadOut.model_validate(lead), message="Lead status updated")
