from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.models.models import Order, BookingV2, LeadV2

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


@router.get("/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    order_rev = (await db.execute(
        select(func.sum(Order.total)).where(
            Order.created_at >= since,
            Order.payment_status == "completed",
            Order.is_deleted == False,  # noqa: E712
        )
    )).scalar() or 0

    booking_rev = (await db.execute(
        select(func.sum(BookingV2.final_price)).where(
            BookingV2.created_at >= since,
            BookingV2.payment_status == "completed",
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )).scalar() or 0

    new_orders = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= since, Order.is_deleted == False)  # noqa: E712
    )).scalar()

    new_bookings = (await db.execute(
        select(func.count(BookingV2.id)).where(BookingV2.created_at >= since, BookingV2.is_deleted == False)  # noqa: E712
    )).scalar()

    new_leads = (await db.execute(
        select(func.count(LeadV2.id)).where(LeadV2.created_at >= since, LeadV2.is_deleted == False)  # noqa: E712
    )).scalar()

    won_leads = (await db.execute(
        select(func.count(LeadV2.id)).where(
            LeadV2.created_at >= since,
            LeadV2.status == "won",
            LeadV2.is_deleted == False,  # noqa: E712
        )
    )).scalar()

    conversion_rate = round((won_leads / new_leads * 100) if new_leads > 0 else 0, 1)

    top_services = (await db.execute(
        select(
            BookingV2.service_id,
            func.count(BookingV2.id).label("count"),
            func.sum(BookingV2.final_price).label("revenue"),
        ).where(
            BookingV2.created_at >= since,
            BookingV2.is_deleted == False,  # noqa: E712
        ).group_by(BookingV2.service_id).order_by(text("count DESC")).limit(5)
    )).all()

    return {
        "success": True,
        "data": {
            "period_days": days,
            "revenue": {
                "orders": float(order_rev),
                "bookings": float(booking_rev),
                "total": float(order_rev + booking_rev),
            },
            "counts": {
                "orders": new_orders,
                "bookings": new_bookings,
                "leads": new_leads,
                "leads_won": won_leads,
            },
            "conversion_rate": conversion_rate,
            "top_services": [
                {"service_id": str(s.service_id), "count": s.count, "revenue": float(s.revenue or 0)}
                for s in top_services
            ],
        },
    }


@router.get("/revenue-chart")
async def get_revenue_chart(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    results = []
    for i in range(days, -1, -1):
        day = datetime.now(timezone.utc).date() - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        order_rev = (await db.execute(
            select(func.sum(Order.total)).where(
                Order.created_at >= day_start,
                Order.created_at < day_end,
                Order.payment_status == "completed",
                Order.is_deleted == False,  # noqa: E712
            )
        )).scalar() or 0

        booking_rev = (await db.execute(
            select(func.sum(BookingV2.final_price)).where(
                BookingV2.created_at >= day_start,
                BookingV2.created_at < day_end,
                BookingV2.payment_status == "completed",
                BookingV2.is_deleted == False,  # noqa: E712
            )
        )).scalar() or 0

        results.append({
            "date": day.isoformat(),
            "orders": float(order_rev),
            "bookings": float(booking_rev),
            "total": float(order_rev + booking_rev),
        })

    return {"success": True, "data": results}


@router.get("/lead-funnel")
async def get_lead_funnel(
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    statuses = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"]
    funnel = {}
    for status in statuses:
        count = (await db.execute(
            select(func.count(LeadV2.id)).where(
                LeadV2.created_at >= since,
                LeadV2.status == status,
                LeadV2.is_deleted == False,  # noqa: E712
            )
        )).scalar()
        funnel[status] = count

    return {"success": True, "data": funnel}


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
):
    from app.models.models import OrderItem
    results = (await db.execute(
        select(
            OrderItem.product_name,
            func.count(OrderItem.id).label("orders"),
            func.sum(OrderItem.subtotal).label("revenue"),
        ).group_by(OrderItem.product_name).order_by(text("revenue DESC")).limit(limit)
    )).all()

    return {
        "success": True,
        "data": [
            {"product": r.product_name, "orders": r.orders, "revenue": float(r.revenue or 0)}
            for r in results
        ],
    }
