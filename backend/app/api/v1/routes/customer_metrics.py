from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import BookingV2, Order, OrderItem

router = APIRouter(prefix="/admin/customer-metrics", tags=["customer-metrics"])


@router.get("")
async def get_customer_metrics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.read")),
):
    """Return real customer and product metrics from transactional history.

    A customer is identified by the application's existing phone identity key.
    New means first-ever non-deleted commercial activity (order or booking) is
    inside the requested window. Returning means activity exists in the window
    but the first commercial activity predates it. Product metrics use non-deleted
    order items belonging to non-deleted orders. No synthetic values are generated
    and no transactional records are modified.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    activity = union_all(
        select(Order.customer_phone.label("phone"), Order.created_at.label("activity_at")).where(
            Order.is_deleted == False  # noqa: E712
        ),
        select(BookingV2.customer_phone.label("phone"), BookingV2.created_at.label("activity_at")).where(
            BookingV2.is_deleted == False  # noqa: E712
        ),
    ).subquery("customer_activity")

    first_activity = (
        select(
            activity.c.phone,
            func.min(activity.c.activity_at).label("first_activity"),
        )
        .where(activity.c.phone.is_not(None))
        .group_by(activity.c.phone)
        .subquery("first_customer_activity")
    )

    current_activity = (
        select(activity.c.phone)
        .where(
            activity.c.phone.is_not(None),
            activity.c.activity_at >= since,
        )
        .distinct()
        .subquery("current_customer_activity")
    )

    new_customers = await db.scalar(
        select(func.count()).select_from(first_activity).where(first_activity.c.first_activity >= since)
    )

    returning_customers = await db.scalar(
        select(func.count())
        .select_from(
            first_activity.join(
                current_activity,
                first_activity.c.phone == current_activity.c.phone,
            )
        )
        .where(first_activity.c.first_activity < since)
    )

    active_customers = await db.scalar(select(func.count()).select_from(current_activity))

    top_product_rows = (
        await db.execute(
            select(
                OrderItem.product_name,
                func.count(OrderItem.id).label("orders"),
                func.sum(OrderItem.subtotal).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.created_at >= since,
                Order.is_deleted == False,  # noqa: E712
                OrderItem.is_deleted == False,  # noqa: E712
            )
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.subtotal).desc())
            .limit(5)
        )
    ).all()

    return {
        "success": True,
        "data": {
            "period_days": days,
            "new_customers": int(new_customers or 0),
            "returning_customers": int(returning_customers or 0),
            "active_customers": int(active_customers or 0),
            "top_products": [
                {
                    "product": row.product_name,
                    "orders": int(row.orders or 0),
                    "revenue": float(row.revenue or 0),
                }
                for row in top_product_rows
            ],
        },
    }
