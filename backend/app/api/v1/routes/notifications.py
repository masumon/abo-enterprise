from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Notification
from app.schemas.schemas import ApiResponse, PaginatedMeta, PaginatedResponse

router = APIRouter(prefix="/admin/notifications", tags=["notifications"])


def _visible_to(admin_id: str):
    """A notification is visible to an admin if it's broadcast (NULL target)
    or targeted specifically at them."""
    return or_(Notification.target_admin_id.is_(None), Notification.target_admin_id == UUID(admin_id))


@router.get("", response_model=PaginatedResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    type: str | None = Query(None),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    conditions = [Notification.is_deleted == False, _visible_to(admin_id)]  # noqa: E712
    if unread_only:
        conditions.append(Notification.is_read == False)  # noqa: E712
    if type:
        conditions.append(Notification.type == type)

    total = (await db.execute(select(func.count(Notification.id)).where(and_(*conditions)))).scalar_one()
    rows = (await db.execute(
        select(Notification).where(and_(*conditions))
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return PaginatedResponse(
        data=[
            {
                "id": str(n.id),
                "type": n.type,
                "severity": n.severity,
                "title": n.title,
                "body": n.body,
                "link": n.link,
                "meta": n.meta,
                "is_read": n.is_read,
                "read_at": n.read_at.isoformat() if n.read_at else None,
                "created_at": n.created_at.isoformat(),
                "broadcast": n.target_admin_id is None,
            }
            for n in rows
        ],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=max(1, -(-total // per_page))),
    )


@router.get("/unread-count", response_model=ApiResponse)
async def unread_notification_count(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(
        select(func.count(Notification.id)).where(
            Notification.is_deleted == False,  # noqa: E712
            Notification.is_read == False,  # noqa: E712
            _visible_to(admin_id),
        )
    )).scalar_one()
    return ApiResponse(success=True, data={"count": count})


@router.post("/{notification_id}/read", response_model=ApiResponse)
async def mark_notification_read(
    notification_id: UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.is_deleted == False,  # noqa: E712
            _visible_to(admin_id),
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()

    return ApiResponse(success=True, message="Marked as read")


@router.post("/read-all", response_model=ApiResponse)
async def mark_all_notifications_read(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    from sqlalchemy import update

    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(Notification)
        .where(
            Notification.is_deleted == False,  # noqa: E712
            Notification.is_read == False,  # noqa: E712
            _visible_to(admin_id),
        )
        .values(is_read=True, read_at=now)
    )
    await db.commit()
    return ApiResponse(success=True, data={"updated": result.rowcount}, message="All marked as read")


@router.delete("/{notification_id}", response_model=ApiResponse)
async def dismiss_notification(
    notification_id: UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete — dismiss from the feed without destroying the record."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.is_deleted == False,  # noqa: E712
            _visible_to(admin_id),
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_deleted = True
    await db.commit()
    return ApiResponse(success=True, message="Notification dismissed")
