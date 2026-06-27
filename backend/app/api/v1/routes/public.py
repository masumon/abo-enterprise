from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import BookingV2, LeadV2, Order, Product, Review, Service
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/public", tags=["public"])


def _time_ago(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    minutes = int((now - dt).total_seconds() / 60)
    if minutes < 1:
        return "now"
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h"
    return f"{hours // 24}d"


@router.get("/stats", response_model=ApiResponse)
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    """Public aggregate stats for homepage trust indicators."""
    since = datetime.now(timezone.utc) - timedelta(days=365 * 5)

    total_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.is_deleted == False)  # noqa: E712
    )).scalar() or 0

    total_products = (await db.execute(
        select(func.count(Product.id)).where(
            Product.is_deleted == False,  # noqa: E712
            Product.is_active == True,  # noqa: E712
        )
    )).scalar() or 0

    total_services = (await db.execute(
        select(func.count(Service.id)).where(
            Service.is_deleted == False,  # noqa: E712
            Service.is_active == True,  # noqa: E712
        )
    )).scalar() or 0

    total_leads = (await db.execute(
        select(func.count(LeadV2.id)).where(LeadV2.is_deleted == False)  # noqa: E712
    )).scalar() or 0

    total_reviews = (await db.execute(
        select(func.count(Review.id)).where(Review.is_deleted == False)  # noqa: E712
    )).scalar() or 0

    first_order = (await db.execute(
        select(func.min(Order.created_at)).where(Order.is_deleted == False)  # noqa: E712
    )).scalar()
    years = 5
    if first_order:
        if first_order.tzinfo is None:
            first_order = first_order.replace(tzinfo=timezone.utc)
        years = max(1, (datetime.now(timezone.utc) - first_order).days // 365)

    return ApiResponse(data={
        "orders": total_orders,
        "products": total_products,
        "services": total_services,
        "clients": max(total_leads + total_orders, total_reviews),
        "projects": total_leads,
        "years": years,
        "reviews": total_reviews,
    })


@router.get("/activity", response_model=ApiResponse)
async def get_recent_activity(db: AsyncSession = Depends(get_db)):
    """Recent anonymized activity feed for hero dashboard."""
    activities = []

    orders = (await db.execute(
        select(Order).where(Order.is_deleted == False)  # noqa: E712
        .order_by(Order.created_at.desc()).limit(3)
    )).scalars().all()
    for o in orders:
        activities.append({
            "type": "order",
            "icon": "🛒",
            "text_en": f"New order {o.order_number}",
            "text_bn": f"নতুন অর্ডার {o.order_number}",
            "time": _time_ago(o.created_at),
            "created_at": o.created_at.isoformat(),
        })

    bookings = (await db.execute(
        select(BookingV2).where(BookingV2.is_deleted == False)  # noqa: E712
        .order_by(BookingV2.created_at.desc()).limit(2)
    )).scalars().all()
    for b in bookings:
        activities.append({
            "type": "booking",
            "icon": "📅",
            "text_en": "Service booking confirmed",
            "text_bn": "সেবা বুকিং নিশ্চিত",
            "time": _time_ago(b.created_at),
            "created_at": b.created_at.isoformat(),
        })

    leads = (await db.execute(
        select(LeadV2).where(LeadV2.is_deleted == False)  # noqa: E712
        .order_by(LeadV2.created_at.desc()).limit(2)
    )).scalars().all()
    for lead in leads:
        activities.append({
            "type": "lead",
            "icon": "💼",
            "text_en": f"{lead.lead_type.replace('_', ' ').title()} inquiry",
            "text_bn": f"{lead.lead_type.replace('_', ' ')} জিজ্ঞাসা",
            "time": _time_ago(lead.created_at),
            "created_at": lead.created_at.isoformat(),
        })

    activities.sort(key=lambda a: a["created_at"], reverse=True)
    return ApiResponse(data=activities[:5])
