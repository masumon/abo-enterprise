import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, lead_notification_html, customer_lead_confirmation_html
from app.models.models import LeadV2, ActivityLog, AdminUser
from app.core.rate_limit import rate_limit
from app.schemas.schemas import (
    LeadV2Out,
    LeadV2Create,
    LeadV2StatusUpdate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)
import random
import string

router = APIRouter(prefix="/service-leads", tags=["service-leads"])


def generate_lead_number():
    """Generate unique lead number LF-YYYY-XXXXXX"""
    year = datetime.now(timezone.utc).year
    random_part = "".join(random.choices(string.digits, k=6))
    return f"LF-{year}-{random_part}"


def calculate_lead_score(lead: LeadV2) -> int:
    """Calculate qualification score for a lead (0-100)"""
    score = 0

    # Budget impact (max 30 points)
    if lead.budget_min and lead.budget_min > 500000:
        score += 30
    elif lead.budget_min and lead.budget_min > 100000:
        score += 20
    elif lead.budget_min and lead.budget_min > 50000:
        score += 10

    # Company size (max 25 points)
    if lead.company_size == "enterprise":
        score += 25
    elif lead.company_size == "large":
        score += 15
    elif lead.company_size == "medium":
        score += 10

    # Lead quality (max 20 points)
    if lead.project_description and len(lead.project_description) > 100:
        score += 10
    if lead.requirements and len(lead.requirements) > 100:
        score += 10

    # Response time (max 15 points)
    if lead.created_at:
        hours_ago = (datetime.now(timezone.utc) - lead.created_at).total_seconds() / 3600
        if hours_ago < 24:
            score += 15
        elif hours_ago < 7 * 24:
            score += 5

    # Service type value (max 10 points)
    high_value_services = ["software", "ai", "automation", "custom_quote"]
    if lead.lead_type in high_value_services:
        score += 10

    return min(score, 100)


# ==================== PUBLIC ENDPOINTS ====================

@router.post("", response_model=ApiResponse, dependencies=[Depends(rate_limit("leads_v2_create", 10, 600))])
async def create_lead(
    payload: LeadV2Create,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Submit a lead inquiry (public)"""
    lead_number = generate_lead_number()

    lead = LeadV2(
        lead_number=lead_number,
        **payload.model_dump(),
    )

    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    # Calculate and update score
    score = calculate_lead_score(lead)
    lead.qualification_score = score
    await db.commit()
    await db.refresh(lead)

    budget_display = payload.budget_range or (
        f"৳{payload.budget_min:,.0f}–৳{payload.budget_max:,.0f}"
        if payload.budget_min and payload.budget_max
        else "Not specified"
    )

    from app.core.email_config import resolve_notify_email
    _notify_to = await resolve_notify_email(db)
    if _notify_to:
        html = lead_notification_html(
            payload.name,
            payload.phone,
            payload.lead_type,
            payload.project_description or "",
            budget_display,
        )
        background_tasks.add_task(
            send_email,
            _notify_to,
            f"New Lead {lead.lead_number} (Score: {lead.qualification_score}) — ABO Enterprise",
            html,
        )

    if payload.email:
        html = customer_lead_confirmation_html(
            lead.lead_number,
            payload.name,
            payload.lead_type,
            settings.WHATSAPP_NUMBER,
        )
        background_tasks.add_task(
            send_email,
            payload.email,
            f"We received your inquiry #{lead.lead_number} — ABO Enterprise",
            html,
        )

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead submitted successfully",
    )


@router.get("/{lead_id}", response_model=ApiResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get lead details (public - if they have access token)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead fetched successfully",
    )


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/leads", response_model=PaginatedResponse)
async def list_leads_admin(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
    lead_type: str | None = None,
    min_score: int | None = None,
):
    """List all leads (admin only)"""
    query = select(LeadV2).where(LeadV2.is_deleted == False)

    if status:
        query = query.where(LeadV2.status == status)

    if lead_type:
        query = query.where(LeadV2.lead_type == lead_type)

    if min_score is not None:
        query = query.where(LeadV2.qualification_score >= min_score)

    count_conditions = [LeadV2.is_deleted == False]
    if status:
        count_conditions.append(LeadV2.status == status)
    if lead_type:
        count_conditions.append(LeadV2.lead_type == lead_type)
    if min_score is not None:
        count_conditions.append(LeadV2.qualification_score >= min_score)

    count_result = await db.execute(
        select(func.count(LeadV2.id)).where(and_(*count_conditions))
    )
    total = count_result.scalar()

    # Pagination and sorting
    total_pages = (total + per_page - 1) // per_page
    query = (
        query.offset((page - 1) * per_page)
        .limit(per_page)
        .order_by(LeadV2.qualification_score.desc(), LeadV2.created_at.desc())
    )

    result = await db.execute(query)
    leads = result.scalars().all()

    return PaginatedResponse(
        data=[LeadV2Out.model_validate(l).model_dump() for l in leads],
        message="Leads fetched successfully",
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/admin/leads/{lead_id}", response_model=ApiResponse)
async def get_lead_admin(
    lead_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get lead details (admin)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead fetched successfully",
    )


@router.patch("/admin/leads/{lead_id}/status", response_model=ApiResponse)
async def update_lead_status(
    lead_id: uuid.UUID,
    payload: LeadV2StatusUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update lead status (admin only)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = lead.status
    lead.status = payload.status

    if payload.status == "won":
        lead.converted_at = datetime.now(timezone.utc)
    elif payload.status == "lost":
        lead.reason_lost = payload.reason_lost

    await db.commit()
    await db.refresh(lead)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="lead",
        entity_id=lead.id,
        old_values={"status": old_status},
        new_values={"status": lead.status},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead status updated successfully",
    )


@router.patch("/admin/leads/{lead_id}/score", response_model=ApiResponse)
async def update_lead_score(
    lead_id: uuid.UUID,
    score: int = Query(..., ge=0, le=100),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update lead qualification score (admin only)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_score = lead.qualification_score
    lead.qualification_score = score
    await db.commit()
    await db.refresh(lead)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="lead",
        entity_id=lead.id,
        old_values={"score": old_score},
        new_values={"score": score},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead score updated successfully",
    )


@router.patch("/admin/leads/{lead_id}/assign", response_model=ApiResponse)
async def assign_lead(
    lead_id: uuid.UUID,
    assigned_to: uuid.UUID = Query(...),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Assign lead to team member (admin only)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify assigned_to user exists
    user_result = await db.execute(select(AdminUser).where(AdminUser.id == assigned_to))
    if not user_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Team member not found")

    old_assigned = lead.assigned_to
    lead.assigned_to = assigned_to
    await db.commit()
    await db.refresh(lead)

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="lead",
        entity_id=lead.id,
        old_values={"assigned_to": str(old_assigned) if old_assigned else None},
        new_values={"assigned_to": str(assigned_to)},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=LeadV2Out.model_validate(lead).model_dump(),
        message="Lead assigned successfully",
    )


@router.delete("/admin/leads/{lead_id}", response_model=ApiResponse)
async def delete_lead(
    lead_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete lead (admin only)"""
    result = await db.execute(
        select(LeadV2).where(and_(LeadV2.id == lead_id, LeadV2.is_deleted == False))
    )
    lead = result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.is_deleted = True
    await db.commit()

    # Log activity
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="delete",
        entity_type="lead",
        entity_id=lead.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="Lead deleted successfully")


# ==================== LEAD STATISTICS ====================

@router.get("/admin/leads/stats/summary", response_model=ApiResponse)
async def get_lead_stats(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get lead statistics summary"""
    # Total leads
    total_result = await db.execute(
        select(func.count(LeadV2.id)).where(LeadV2.is_deleted == False)
    )
    total_leads = total_result.scalar() or 0

    # New leads
    new_result = await db.execute(
        select(func.count(LeadV2.id)).where(
            and_(LeadV2.is_deleted == False, LeadV2.status == "new")
        )
    )
    new_leads = new_result.scalar() or 0

    # Hot leads (score >= 70)
    hot_result = await db.execute(
        select(func.count(LeadV2.id)).where(
            and_(
                LeadV2.is_deleted == False,
                LeadV2.qualification_score >= 70,
            )
        )
    )
    hot_leads = hot_result.scalar() or 0

    # Won
    won_result = await db.execute(
        select(func.count(LeadV2.id)).where(
            and_(LeadV2.is_deleted == False, LeadV2.status == "won")
        )
    )
    won_leads = won_result.scalar() or 0

    # Conversion rate
    conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0

    return ApiResponse(
        data={
            "total_leads": total_leads,
            "new_leads": new_leads,
            "hot_leads": hot_leads,
            "won_leads": won_leads,
            "conversion_rate": round(conversion_rate, 2),
        },
        message="Lead stats fetched successfully",
    )


@router.get("/admin/leads/stats/by-service", response_model=ApiResponse)
async def get_leads_by_service(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get lead distribution by service type"""
    result = await db.execute(
        select(
            LeadV2.lead_type,
            func.count(LeadV2.id).label("count"),
        )
        .where(LeadV2.is_deleted == False)
        .group_by(LeadV2.lead_type)
        .order_by(func.count(LeadV2.id).desc())
    )
    rows = result.all()

    data = [{"lead_type": row[0], "count": row[1]} for row in rows]

    return ApiResponse(
        data=data,
        message="Leads by service fetched successfully",
    )
