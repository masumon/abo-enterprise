from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.models import BookingV2, LeadV2, Order
from app.models.customer import Customer
from app.schemas.schemas import PaginatedMeta, PaginatedResponse

router = APIRouter(prefix="/admin", tags=["customers"])


class CustomerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=5000)


def _customer_activity_subqueries():
    order_count = (
        select(func.count(Order.id))
        .where(Order.customer_phone == Customer.phone, Order.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    booking_count = (
        select(func.count(BookingV2.id))
        .where(BookingV2.customer_phone == Customer.phone, BookingV2.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    lead_count = (
        select(func.count(LeadV2.id))
        .where(LeadV2.phone == Customer.phone, LeadV2.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    order_value = (
        select(func.coalesce(func.sum(Order.total), 0))
        .where(Order.customer_phone == Customer.phone, Order.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    booking_value = (
        select(func.coalesce(func.sum(func.coalesce(BookingV2.final_price, BookingV2.quoted_price, 0)), 0))
        .where(BookingV2.customer_phone == Customer.phone, BookingV2.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    last_order = (
        select(func.max(Order.created_at))
        .where(Order.customer_phone == Customer.phone, Order.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    last_booking = (
        select(func.max(BookingV2.created_at))
        .where(BookingV2.customer_phone == Customer.phone, BookingV2.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    last_lead = (
        select(func.max(LeadV2.created_at))
        .where(LeadV2.phone == Customer.phone, LeadV2.is_deleted == False)  # noqa: E712
        .correlate(Customer)
        .scalar_subquery()
    )
    return order_count, booking_count, lead_count, order_value, booking_value, last_order, last_booking, last_lead


def _serialize_customer(row: Any) -> dict:
    return {
        "id": str(row.id),
        "phone": row.phone,
        "name": row.name,
        "email": row.email,
        "company": row.company,
        "address": row.address,
        "status": "deleted" if row.is_deleted else "active",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "order_count": int(row.order_count or 0),
        "booking_count": int(row.booking_count or 0),
        "lead_count": int(row.lead_count or 0),
        "order_value": float(row.order_value or 0),
        "booking_value": float(row.booking_value or 0),
        "last_activity": row.last_activity.isoformat() if row.last_activity else None,
    }


async def _customer_with_activity(db: AsyncSession, customer_id):
    (
        order_count,
        booking_count,
        lead_count,
        order_value,
        booking_value,
        last_order,
        last_booking,
        last_lead,
    ) = _customer_activity_subqueries()
    last_activity = func.greatest(last_order, last_booking, last_lead)
    result = await db.execute(
        select(
            Customer,
            order_count.label("order_count"),
            booking_count.label("booking_count"),
            lead_count.label("lead_count"),
            order_value.label("order_value"),
            booking_value.label("booking_value"),
            last_activity.label("last_activity"),
        ).where(Customer.id == customer_id)
    )
    row = result.first()
    return row


@router.get("/customers", response_model=PaginatedResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.read")),
):
    """List canonical customers while deriving transaction history by phone.

    Phone remains the cross-module identity key for legacy transaction tables;
    the durable profile itself now comes from the canonical ``customers`` table.
    """
    (
        order_count,
        booking_count,
        lead_count,
        order_value,
        booking_value,
        last_order,
        last_booking,
        last_lead,
    ) = _customer_activity_subqueries()
    last_activity = func.greatest(last_order, last_booking, last_lead)

    conditions = [] if include_deleted else [Customer.is_deleted == False]  # noqa: E712
    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Customer.phone.ilike(term),
                Customer.name.ilike(term),
                Customer.email.ilike(term),
                Customer.company.ilike(term),
            )
        )

    base = select(Customer).where(*conditions)
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0

    result = await db.execute(
        select(
            Customer,
            order_count.label("order_count"),
            booking_count.label("booking_count"),
            lead_count.label("lead_count"),
            order_value.label("order_value"),
            booking_value.label("booking_value"),
            last_activity.label("last_activity"),
        )
        .where(*conditions)
        .order_by(last_activity.desc().nullslast(), Customer.name.asc(), Customer.phone.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    rows = result.all()
    data = []
    for customer, *metrics in rows:
        data.append(
            _serialize_customer(
                type(
                    "CustomerRow",
                    (),
                    {
                        **customer.__dict__,
                        "order_count": metrics[0],
                        "booking_count": metrics[1],
                        "lead_count": metrics[2],
                        "order_value": metrics[3],
                        "booking_value": metrics[4],
                        "last_activity": metrics[5],
                    },
                )()
            )
        )

    return PaginatedResponse(
        data=data,
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=max(1, -(-total // per_page)),
        ),
    )


@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.read")),
):
    row = await _customer_with_activity(db, customer_id)
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer, *metrics = row
    return {
        "data": _serialize_customer(
            type(
                "CustomerRow",
                (),
                {
                    **customer.__dict__,
                    "order_count": metrics[0],
                    "booking_count": metrics[1],
                    "lead_count": metrics[2],
                    "order_value": metrics[3],
                    "booking_value": metrics[4],
                    "last_activity": metrics[5],
                },
            )()
        )
    }


@router.get("/customers/{customer_id}/history")
async def get_customer_history(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.read")),
):
    customer_result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders = (
        await db.execute(
            select(Order)
            .where(Order.customer_phone == customer.phone, Order.is_deleted == False)  # noqa: E712
            .order_by(Order.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    bookings = (
        await db.execute(
            select(BookingV2)
            .where(BookingV2.customer_phone == customer.phone, BookingV2.is_deleted == False)  # noqa: E712
            .order_by(BookingV2.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    leads = (
        await db.execute(
            select(LeadV2)
            .where(LeadV2.phone == customer.phone, LeadV2.is_deleted == False)  # noqa: E712
            .order_by(LeadV2.created_at.desc())
            .limit(50)
        )
    ).scalars().all()

    return {
        "data": {
            "customer": _serialize_customer(
                type(
                    "CustomerRow",
                    (),
                    {
                        **customer.__dict__,
                        "order_count": len(orders),
                        "booking_count": len(bookings),
                        "lead_count": len(leads),
                        "order_value": sum(float(o.total or 0) for o in orders),
                        "booking_value": sum(float(b.final_price or b.quoted_price or 0) for b in bookings),
                        "last_activity": max(
                            [x.created_at for x in (*orders, *bookings, *leads) if x.created_at],
                            default=None,
                        ),
                    },
                )()
            ),
            "orders": [
                {
                    "id": str(o.id),
                    "order_number": o.order_number,
                    "status": o.order_status,
                    "payment_status": o.payment_status,
                    "total": float(o.total or 0),
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                }
                for o in orders
            ],
            "bookings": [
                {
                    "id": str(b.id),
                    "booking_number": b.booking_number,
                    "status": b.status,
                    "payment_status": b.payment_status,
                    "total": float(b.final_price or b.quoted_price or 0),
                    "created_at": b.created_at.isoformat() if b.created_at else None,
                }
                for b in bookings
            ],
            "leads": [
                {
                    "id": str(l.id),
                    "status": l.status,
                    "source": l.source,
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                }
                for l in leads
            ],
        }
    }


@router.patch("/customers/{customer_id}")
async def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_role("customers.write")),
):
    customer_result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.is_deleted:
        raise HTTPException(status_code=409, detail="Deleted customer cannot be edited")

    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(customer, key, value.strip() if isinstance(value, str) else value)
    customer.updated_at = datetime.now(customer.updated_at.tzinfo) if customer.updated_at else datetime.utcnow()

    await db.commit()
    await db.refresh(customer)
    return {"data": {"id": str(customer.id), "message": "Customer updated successfully"}}
