from sqlalchemy import case, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Query

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import BookingV2, LeadV2, Order
from app.schemas.schemas import PaginatedMeta, PaginatedResponse

router = APIRouter(prefix="/admin", tags=["customers"])


@router.get("/customers", response_model=PaginatedResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.read")),
):
    """Read-only CRM index assembled from live transactional sources.

    Phone is the current cross-module identity key because the application
    does not yet have a canonical customer master table. This endpoint does
    not create or mutate customer records and therefore requires no migration.
    """
    order_rows = select(
        Order.customer_phone.label("phone"),
        Order.customer_name.label("name"),
        Order.customer_email.label("email"),
        Order.company_name.label("company"),
        Order.created_at.label("activity_at"),
        literal("order").label("source"),
        Order.total.label("order_value"),
        literal(0).label("booking_value"),
    ).where(Order.is_deleted == False)  # noqa: E712

    booking_rows = select(
        BookingV2.customer_phone.label("phone"),
        BookingV2.customer_name.label("name"),
        BookingV2.customer_email.label("email"),
        BookingV2.customer_company.label("company"),
        BookingV2.created_at.label("activity_at"),
        literal("booking").label("source"),
        literal(0).label("order_value"),
        func.coalesce(BookingV2.final_price, BookingV2.quoted_price, 0).label("booking_value"),
    ).where(BookingV2.is_deleted == False)  # noqa: E712

    lead_rows = select(
        LeadV2.phone.label("phone"),
        LeadV2.name.label("name"),
        LeadV2.email.label("email"),
        LeadV2.company.label("company"),
        LeadV2.created_at.label("activity_at"),
        literal("lead").label("source"),
        literal(0).label("order_value"),
        literal(0).label("booking_value"),
    ).where(LeadV2.is_deleted == False)  # noqa: E712

    activity = order_rows.union_all(booking_rows, lead_rows).subquery("customer_activity")
    ranked = select(
        activity,
        func.row_number().over(
            partition_by=activity.c.phone,
            order_by=activity.c.activity_at.desc(),
        ).label("rn"),
    ).subquery("ranked_activity")

    customer_query = select(
        ranked.c.phone,
        func.max(case((ranked.c.rn == 1, ranked.c.name), else_=None)).label("name"),
        func.max(case((ranked.c.rn == 1, ranked.c.email), else_=None)).label("email"),
        func.max(case((ranked.c.rn == 1, ranked.c.company), else_=None)).label("company"),
        func.sum(case((ranked.c.source == "order", 1), else_=0)).label("order_count"),
        func.sum(case((ranked.c.source == "booking", 1), else_=0)).label("booking_count"),
        func.sum(case((ranked.c.source == "lead", 1), else_=0)).label("lead_count"),
        func.sum(ranked.c.order_value).label("order_value"),
        func.sum(ranked.c.booking_value).label("booking_value"),
        func.max(ranked.c.activity_at).label("last_activity"),
    ).group_by(ranked.c.phone).subquery("customers")

    if search and search.strip():
        term = f"%{search.strip()}%"
        customer_query = customer_query.where(
            or_(
                customer_query.c.phone.ilike(term),
                customer_query.c.name.ilike(term),
                customer_query.c.email.ilike(term),
                customer_query.c.company.ilike(term),
            )
        )

    total = await db.scalar(select(func.count()).select_from(customer_query)) or 0
    result = await db.execute(
        select(customer_query)
        .order_by(customer_query.c.last_activity.desc(), customer_query.c.phone.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    rows = result.mappings().all()
    return PaginatedResponse(
        data=[
            {
                "phone": row["phone"],
                "name": row["name"],
                "email": row["email"],
                "company": row["company"],
                "order_count": int(row["order_count"] or 0),
                "booking_count": int(row["booking_count"] or 0),
                "lead_count": int(row["lead_count"] or 0),
                "order_value": float(row["order_value"] or 0),
                "booking_value": float(row["booking_value"] or 0),
                "last_activity": row["last_activity"].isoformat() if row["last_activity"] else None,
            }
            for row in rows
        ],
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=max(1, -(-total // per_page)),
        ),
    )
