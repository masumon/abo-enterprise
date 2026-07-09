from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, Date, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import BookingV2, LeadV2, Order, OrderItem, Service

router = APIRouter(prefix="/admin/analytics", tags=["analytics"])


@router.get("/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    prev_since = now - timedelta(days=days * 2)

    # Sequential awaits: a single AsyncSession must not run concurrent queries
    # (asyncio.gather on one session raises "concurrent operations are not permitted").
    async def window_stats(start: datetime, end: datetime | None) -> dict:
        def in_window(col):
            conds = [col >= start]
            if end is not None:
                conds.append(col < end)
            return conds

        order_rev = await db.scalar(select(func.sum(Order.total)).where(
            *in_window(Order.created_at),
            # COD orders never reach payment_status="completed"; count delivered ones too.
            or_(Order.payment_status == "completed", Order.order_status == "delivered"),
            Order.is_deleted == False,  # noqa: E712
        ))
        booking_rev = await db.scalar(select(func.sum(BookingV2.final_price)).where(
            *in_window(BookingV2.created_at),
            BookingV2.payment_status == "completed",
            BookingV2.is_deleted == False,  # noqa: E712
        ))
        orders = await db.scalar(select(func.count(Order.id)).where(*in_window(Order.created_at), Order.is_deleted == False))  # noqa: E712
        bookings = await db.scalar(select(func.count(BookingV2.id)).where(*in_window(BookingV2.created_at), BookingV2.is_deleted == False))  # noqa: E712
        leads = await db.scalar(select(func.count(LeadV2.id)).where(*in_window(LeadV2.created_at), LeadV2.is_deleted == False))  # noqa: E712
        won = await db.scalar(select(func.count(LeadV2.id)).where(
            *in_window(LeadV2.created_at),
            LeadV2.status == "won",
            LeadV2.is_deleted == False,  # noqa: E712
        ))
        return {
            "order_rev": float(order_rev or 0),
            "booking_rev": float(booking_rev or 0),
            "orders": orders or 0,
            "bookings": bookings or 0,
            "leads": leads or 0,
            "won": won or 0,
        }

    cur = await window_stats(since, None)
    prev = await window_stats(prev_since, since)

    conversion_rate = round((cur["won"] / cur["leads"] * 100) if cur["leads"] > 0 else 0, 1)

    def pct_change(current: float, previous: float) -> float | None:
        """Change vs previous window, % (None when there is no baseline)."""
        if previous <= 0:
            return None
        return round((current - previous) / previous * 100, 1)

    top_services = (await db.execute(
        select(
            BookingV2.service_id,
            Service.name_en,
            Service.name_bn,
            func.count(BookingV2.id).label("count"),
            func.sum(BookingV2.final_price).label("revenue"),
        ).join(Service, Service.id == BookingV2.service_id, isouter=True)
        .where(
            BookingV2.created_at >= since,
            BookingV2.is_deleted == False,  # noqa: E712
        ).group_by(BookingV2.service_id, Service.name_en, Service.name_bn)
        .order_by(text("count DESC")).limit(5)
    )).all()

    return {
        "success": True,
        "data": {
            "period_days": days,
            "revenue": {
                "orders": cur["order_rev"],
                "bookings": cur["booking_rev"],
                "total": cur["order_rev"] + cur["booking_rev"],
            },
            "counts": {
                "orders": cur["orders"],
                "bookings": cur["bookings"],
                "leads": cur["leads"],
                "leads_won": cur["won"],
            },
            "conversion_rate": conversion_rate,
            # vs the immediately preceding window of the same length
            "trends": {
                "revenue_pct": pct_change(
                    cur["order_rev"] + cur["booking_rev"],
                    prev["order_rev"] + prev["booking_rev"],
                ),
                "orders_pct": pct_change(cur["orders"], prev["orders"]),
                "bookings_pct": pct_change(cur["bookings"], prev["bookings"]),
                "leads_pct": pct_change(cur["leads"], prev["leads"]),
            },
            "top_services": [
                {
                    "service_id": str(s.service_id),
                    "name": s.name_en or "Unknown service",
                    "name_bn": s.name_bn or s.name_en or "",
                    "count": s.count,
                    "revenue": float(s.revenue or 0),
                }
                for s in top_services
            ],
        },
    }


@router.get("/revenue-chart")
async def get_revenue_chart(
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    order_result = await db.execute(
        select(
            cast(Order.created_at, Date).label("day"),
            func.sum(Order.total).label("revenue"),
        ).where(
            Order.created_at >= since,
            or_(Order.payment_status == "completed", Order.order_status == "delivered"),
            Order.is_deleted == False,  # noqa: E712
        ).group_by(cast(Order.created_at, Date))
    )
    booking_result = await db.execute(
        select(
            cast(BookingV2.created_at, Date).label("day"),
            func.sum(BookingV2.final_price).label("revenue"),
        ).where(
            BookingV2.created_at >= since,
            BookingV2.payment_status == "completed",
            BookingV2.is_deleted == False,  # noqa: E712
        ).group_by(cast(BookingV2.created_at, Date))
    )
    order_rows = order_result.all()
    booking_rows = booking_result.all()

    order_by_day = {r.day.isoformat(): float(r.revenue or 0) for r in order_rows}
    booking_by_day = {r.day.isoformat(): float(r.revenue or 0) for r in booking_rows}

    results = []
    for i in range(days, -1, -1):
        day = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        orders = order_by_day.get(day, 0)
        bookings = booking_by_day.get(day, 0)
        results.append({
            "date": day,
            "orders": orders,
            "bookings": bookings,
            "total": orders + bookings,
        })

    return {"success": True, "data": results}


@router.get("/lead-funnel")
async def get_lead_funnel(
    days: int = Query(30),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    statuses = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"]

    rows = (await db.execute(
        select(LeadV2.status, func.count(LeadV2.id)).where(
            LeadV2.created_at >= since,
            LeadV2.status.in_(statuses),
            LeadV2.is_deleted == False,  # noqa: E712
        ).group_by(LeadV2.status)
    )).all()
    by_status = dict(rows)
    funnel = {status: by_status.get(status, 0) for status in statuses}

    return {"success": True, "data": funnel}


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(10, le=50),
    days: int | None = Query(None, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = []
    if days is not None:
        conditions.append(OrderItem.created_at >= datetime.now(timezone.utc) - timedelta(days=days))
    results = (await db.execute(
        select(
            OrderItem.product_name,
            func.count(OrderItem.id).label("orders"),
            func.sum(OrderItem.subtotal).label("revenue"),
        ).where(*conditions).group_by(OrderItem.product_name).order_by(text("revenue DESC")).limit(limit)
    )).all()

    return {
        "success": True,
        "data": [
            {"product": r.product_name, "orders": r.orders, "revenue": float(r.revenue or 0)}
            for r in results
        ],
    }


@router.get("/visitors")
async def get_visitor_analytics(
    days: int = Query(30, ge=1, le=365),
    _admin: str = Depends(require_admin),
):
    """Visitor Analytics (GA4 Data API) — admin only.

    Returns {configured: false} when the GA4 service account isn't set up,
    so the UI can show setup guidance instead of an error. Results are
    cached in-process for 5 minutes (see app.core.ga4).
    """
    from app.core.ga4 import fetch_visitor_analytics, is_configured

    if not is_configured():
        return {"success": True, "data": {"configured": False}}
    try:
        data = await fetch_visitor_analytics(days)
        return {"success": True, "data": data}
    except Exception:
        import logging
        logging.getLogger(__name__).exception("GA4 visitor analytics fetch failed")
        return {
            "success": True,
            "data": {
                "configured": True,
                "error": True,
                "days": days,
                "live": {
                    "active_users": 0,
                    "active_pages": [],
                    "active_products": [],
                    "active_services": [],
                    "countries": [],
                    "cities": [],
                    "devices": [],
                    "browsers": [],
                    "traffic_sources": [],
                    "timeline": [],
                    "cache_ttl_seconds": 15,
                },
                "historical": {
                    "users": 0,
                    "new_users": 0,
                    "sessions": 0,
                    "engaged_sessions": 0,
                    "avg_session_duration_sec": 0,
                    "bounce_rate_pct": 0,
                    "engagement_rate_pct": 0,
                    "page_views": 0,
                    "top_pages": [],
                    "landing_pages": [],
                    "exit_pages": [],
                    "traffic_sources": [],
                    "channels": [],
                    "devices": [],
                    "browsers": [],
                    "operating_systems": [],
                    "countries": [],
                    "cities": [],
                    "peak_hours": [],
                    "top_products": [],
                    "top_services": [],
                    "conversion_rate_pct": 0,
                    "contact_views": 0,
                    "lead_generation": 0,
                    "order_funnel": {
                        "sessions": 0,
                        "engaged_sessions": 0,
                        "product_page_views": 0,
                        "service_page_views": 0,
                    },
                    "revenue": None,
                },
                "realtime_active_users": 0,
                "totals": {
                    "visitors": 0,
                    "new_visitors": 0,
                    "sessions": 0,
                    "engaged_sessions": 0,
                    "engagement_rate_pct": 0,
                    "page_views": 0,
                    "avg_session_duration_sec": 0,
                    "bounce_rate_pct": 0,
                },
                "daily": [],
                "traffic_sources": [],
                "top_pages": [],
                "landing_pages": [],
                "exit_pages": [],
                "devices": [],
                "browsers": [],
                "operating_systems": [],
                "countries": [],
                "cities": [],
                "new_vs_returning": [],
                "peak_hours": [],
                "top_products": [],
                "top_services": [],
                "contact_page_views": 0,
                "lead_generation": 0,
                "conversion_rate_pct": 0,
                "order_funnel": {
                    "sessions": 0,
                    "engaged_sessions": 0,
                    "product_page_views": 0,
                    "service_page_views": 0,
                },
            },
            "message": "GA4 data is temporarily unavailable. Showing safe fallback values.",
        }


@router.get("/visitors/live")
async def get_visitor_live_analytics(
    _admin: str = Depends(require_admin),
):
    """Dedicated GA4 Realtime payload for the Live Analytics dashboard section."""
    from app.core.ga4 import fetch_live_analytics, is_configured

    if not is_configured():
        return {"success": True, "data": {"configured": False}}
    try:
        data = await fetch_live_analytics()
        return {"success": True, "data": {"configured": True, **data}}
    except Exception:
        import logging
        logging.getLogger(__name__).exception("GA4 live analytics fetch failed")
        return {
            "success": False,
            "data": {"configured": True, "error": True},
            "message": "Could not load live analytics from Google. Try again shortly.",
        }
