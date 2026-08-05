"""Admin-facing newsletter subscriber management — real table (0024),
replacing the newsletter_subscribers Setting JSON blob. Public signup stays
in public.py (POST /api/v1/public/newsletter); this file only covers the
admin list/delete surface."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import NewsletterSubscriber, ActivityLog
from app.schemas.schemas import ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/admin/newsletter", tags=["newsletter"])


@router.get("/subscribers", response_model=PaginatedResponse)
async def list_subscribers(
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=500),
    search: str | None = None,
    admin_id: str = Depends(require_role("settings.read")),
    db: AsyncSession = Depends(get_db),
):
    conditions = [NewsletterSubscriber.is_active == True]  # noqa: E712
    if search:
        conditions.append(NewsletterSubscriber.email.ilike(f"%{search}%"))

    total = (await db.execute(
        select(func.count(NewsletterSubscriber.id)).where(*conditions)
    )).scalar() or 0

    result = await db.execute(
        select(NewsletterSubscriber).where(*conditions)
        .order_by(NewsletterSubscriber.subscribed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    subs = result.scalars().all()

    return PaginatedResponse(
        data=[
            {
                "id": str(s.id),
                "email": s.email,
                "subscribed_at": s.subscribed_at.isoformat(),
                "source": s.source,
            }
            for s in subs
        ],
        message="Subscribers fetched successfully",
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.delete("/subscribers/{subscriber_id}", response_model=ApiResponse)
async def remove_subscriber(
    subscriber_id: uuid.UUID,
    admin_id: str = Depends(require_role("settings.write")),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe (soft) — keeps the historical row instead of deleting it."""
    result = await db.execute(select(NewsletterSubscriber).where(NewsletterSubscriber.id == subscriber_id))
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    from datetime import datetime, timezone
    sub.is_active = False
    sub.unsubscribed_at = datetime.now(timezone.utc)

    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id), action="delete",
        entity_type="newsletter_subscriber", entity_id=sub.id,
        old_values={"email": sub.email},
    ))
    await db.commit()

    return ApiResponse(message="Subscriber removed")
