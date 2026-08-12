"""Unified Reports — Sales, Products, Services, Customers, Payments,
Courier, Revenue, Profit, Reconciliation, all filterable by an arbitrary
date range (unlike analytics.py's rolling `days` window) with CSV export.

Reuses the same underlying tables analytics.py and bulk.py already query —
this module adds date-range filtering and a wider set of report shapes
rather than a second, disconnected data source.
"""
from __future__ import annotations

import csv
import io
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_role
from app.models.customer import Customer
from app.models.models import (
    BkashTransaction,
    BookingV2,
    NagadTransaction,
    Order,
    OrderItem,
    Product,
    Service,
    SslcommerzTransaction,
)
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/admin/reports", tags=["reports"])

MAX_ROWS = 5000


def _window(start_date: date | None, end_date: date | None) -> tuple[datetime, datetime]:
    """Defaults to the last 30 days when unset. End is exclusive (start of the
    day after end_date), so a single-day range (start == end) includes that
    whole day."""
    end = end_date or datetime.now(timezone.utc).date()
    start = start_date or (end - timedelta(days=30))
    if start > end:
        raise HTTPException(status_code=422, detail="start_date must be on or before end_date")
    start_dt = datetime.combine(start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end, time.min, tzinfo=timezone.utc) + timedelta(days=1)
    return start_dt, end_dt


async def _report_sales(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = (await db.execute(
        select(
            func.date(Order.created_at).label("day"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.total), 0).label("orders_total"),
        )
        .where(Order.created_at >= start, Order.created_at < end, Order.is_deleted == False)  # noqa: E712
        .group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
    )).all()
    booking_rows = dict((r.day, r) for r in (await db.execute(
        select(
            func.date(BookingV2.created_at).label("day"),
            func.count(BookingV2.id).label("bookings"),
            func.coalesce(func.sum(func.coalesce(BookingV2.final_price, BookingV2.quoted_price)), 0).label("bookings_total"),
        )
        .where(BookingV2.created_at >= start, BookingV2.created_at < end, BookingV2.is_deleted == False)  # noqa: E712
        .group_by(func.date(BookingV2.created_at)).order_by(func.date(BookingV2.created_at))
    )).all())
    result = []
    for r in rows:
        b = booking_rows.get(r.day)
        result.append({
            "date": r.day.isoformat(),
            "orders": r.orders,
            "orders_total": float(r.orders_total),
            "bookings": b.bookings if b else 0,
            "bookings_total": float(b.bookings_total) if b else 0.0,
        })
    # Days with only bookings, no orders
    for day, b in booking_rows.items():
        if not any(r["date"] == day.isoformat() for r in result):
            result.append({"date": day.isoformat(), "orders": 0, "orders_total": 0.0, "bookings": b.bookings, "bookings_total": float(b.bookings_total)})
    result.sort(key=lambda r: r["date"])
    return result


async def _report_revenue(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = (await db.execute(
        select(
            func.date(Order.created_at).label("day"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
        )
        .where(
            Order.created_at >= start, Order.created_at < end, Order.is_deleted == False,  # noqa: E712
            or_(Order.payment_status == "completed", Order.order_status == "delivered"),
        )
        .group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at))
    )).all()
    return [{"date": r.day.isoformat(), "revenue": float(r.revenue)} for r in rows]


async def _report_products(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = (await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.subtotal).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.created_at >= start, Order.created_at < end, Order.is_deleted == False, OrderItem.is_deleted == False)  # noqa: E712
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.subtotal).desc())
        .limit(MAX_ROWS)
    )).all()
    return [{"product": r.product_name, "units_sold": int(r.units_sold), "revenue": float(r.revenue)} for r in rows]


async def _report_services(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = (await db.execute(
        select(
            Service.name_en, Service.name_bn,
            func.count(BookingV2.id).label("bookings"),
            func.coalesce(func.sum(func.coalesce(BookingV2.final_price, BookingV2.quoted_price)), 0).label("revenue"),
        )
        .join(Service, Service.id == BookingV2.service_id, isouter=True)
        .where(BookingV2.created_at >= start, BookingV2.created_at < end, BookingV2.is_deleted == False)  # noqa: E712
        .group_by(Service.name_en, Service.name_bn)
        .order_by(func.count(BookingV2.id).desc())
    )).all()
    return [{"service": r.name_en or "Unlisted", "service_bn": r.name_bn or "", "bookings": r.bookings, "revenue": float(r.revenue)} for r in rows]


async def _report_customers(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    new_customers = (await db.execute(
        select(func.count(Customer.id)).where(Customer.created_at >= start, Customer.created_at < end, Customer.is_deleted == False)  # noqa: E712
    )).scalar_one()
    top = (await db.execute(
        select(
            Customer.name, Customer.phone,
            func.coalesce(func.sum(Order.total), 0).label("order_value"),
            func.count(func.distinct(Order.id)).label("order_count"),
        )
        .join(Order, Order.customer_id == Customer.id)
        .where(Order.created_at >= start, Order.created_at < end, Order.is_deleted == False, Customer.is_deleted == False)  # noqa: E712
        .group_by(Customer.id, Customer.name, Customer.phone)
        .order_by(func.sum(Order.total).desc())
        .limit(20)
    )).all()
    return [{"summary": True, "new_customers": new_customers}] + [
        {"customer": r.name, "phone": r.phone, "order_count": r.order_count, "order_value": float(r.order_value)}
        for r in top
    ]


async def _report_payments(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    paid = (await db.execute(select(func.count(Order.id)).where(Order.created_at >= start, Order.created_at < end, Order.payment_status == "completed", Order.is_deleted == False))).scalar_one()  # noqa: E712
    pending = (await db.execute(select(func.count(Order.id)).where(Order.created_at >= start, Order.created_at < end, Order.payment_status == "pending", Order.is_deleted == False))).scalar_one()  # noqa: E712
    failed = (await db.execute(select(func.count(Order.id)).where(Order.created_at >= start, Order.created_at < end, Order.payment_status == "failed", Order.is_deleted == False))).scalar_one()  # noqa: E712
    rows = [{"status": "paid", "orders": paid}, {"status": "pending", "orders": pending}, {"status": "failed", "orders": failed}]
    for name, model in (("bkash", BkashTransaction), ("nagad", NagadTransaction), ("sslcommerz", SslcommerzTransaction)):
        completed = (await db.execute(select(func.count(model.id), func.coalesce(func.sum(model.amount), 0)).where(model.created_at >= start, model.created_at < end, model.status == "Completed"))).one()
        rows.append({"gateway": name, "completed_count": completed[0], "completed_amount": float(completed[1])})
    return rows


async def _report_courier(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    shipped = (await db.execute(select(func.count(Order.id)).where(Order.created_at >= start, Order.created_at < end, Order.courier_consignment_id.isnot(None), Order.is_deleted == False))).scalar_one()  # noqa: E712
    delivered = (await db.execute(select(func.count(Order.id)).where(Order.created_at >= start, Order.created_at < end, Order.courier_consignment_id.isnot(None), Order.order_status == "delivered", Order.is_deleted == False))).scalar_one()  # noqa: E712
    stalled = (await db.execute(select(func.count(Order.id)).where(
        Order.order_status == "shipped", Order.courier_consignment_id.isnot(None),
        Order.updated_at < datetime.now(timezone.utc) - timedelta(days=5), Order.is_deleted == False,  # noqa: E712
    ))).scalar_one()
    return [{"handed_to_courier": shipped, "delivered": delivered, "stalled_5d_plus": stalled,
             "note": "Steadfast is push-only in this integration — no delivery-status webhook/poll syncs back, "
                     "so 'stalled' is a proxy (shipped 5+ days without reaching delivered), not a real exception feed."}]


async def _report_profit(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = (await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units_sold"),
            func.sum(OrderItem.subtotal).label("revenue"),
            Product.cost_price,
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == OrderItem.product_id, isouter=True)
        .where(Order.created_at >= start, Order.created_at < end, Order.is_deleted == False, OrderItem.is_deleted == False)  # noqa: E712
        .group_by(OrderItem.product_name, Product.cost_price)
        .order_by(func.sum(OrderItem.subtotal).desc())
        .limit(MAX_ROWS)
    )).all()
    excluded = 0
    out = []
    for r in rows:
        if r.cost_price is None:
            excluded += 1
            out.append({"product": r.product_name, "units_sold": int(r.units_sold), "revenue": float(r.revenue), "cost": None, "profit": None})
        else:
            cost = float(r.cost_price) * int(r.units_sold)
            out.append({"product": r.product_name, "units_sold": int(r.units_sold), "revenue": float(r.revenue), "cost": cost, "profit": float(r.revenue) - cost})
    out.insert(0, {"summary": True, "products_missing_cost_price": excluded,
                    "note": "Products without a Cost Price set (Admin → Products) show profit as null rather than 0 — set it there to include them."})
    return out


async def _report_reconciliation(db: AsyncSession, start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Computed live from the gateway transaction tables (bkash/nagad/
    sslcommerz), not the payment_reconciliation table — nothing in this
    codebase writes rows to that table, so it's always empty."""
    out = []
    for name, model in (("bkash", BkashTransaction), ("nagad", NagadTransaction), ("sslcommerz", SslcommerzTransaction)):
        for status in ("Completed", "Failed", "Initiated"):
            count, total = (await db.execute(
                select(func.count(model.id), func.coalesce(func.sum(model.amount), 0))
                .where(model.created_at >= start, model.created_at < end, model.status == status)
            )).one()
            if count:
                out.append({"gateway": name, "status": status, "transactions": count, "amount": float(total)})
    return out


REPORT_BUILDERS: dict[str, Callable[[AsyncSession, datetime, datetime], Awaitable[list[dict[str, Any]]]]] = {
    "sales": _report_sales,
    "revenue": _report_revenue,
    "products": _report_products,
    "services": _report_services,
    "customers": _report_customers,
    "payments": _report_payments,
    "courier": _report_courier,
    "profit": _report_profit,
    "reconciliation": _report_reconciliation,
}


@router.get("/{report_type}", response_model=ApiResponse)
async def get_report(
    report_type: str,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("analytics.read")),
):
    builder = REPORT_BUILDERS.get(report_type)
    if not builder:
        raise HTTPException(status_code=404, detail=f"Unknown report type. Available: {', '.join(sorted(REPORT_BUILDERS))}")
    start, end = _window(start_date, end_date)
    rows = await builder(db, start, end)
    return ApiResponse(success=True, data={
        "report": report_type,
        "start_date": start.date().isoformat(),
        "end_date": (end - timedelta(days=1)).date().isoformat(),
        "rows": rows,
    })


@router.get("/{report_type}/export")
async def export_report(
    report_type: str,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_role("analytics.read")),
):
    builder = REPORT_BUILDERS.get(report_type)
    if not builder:
        raise HTTPException(status_code=404, detail=f"Unknown report type. Available: {', '.join(sorted(REPORT_BUILDERS))}")
    start, end = _window(start_date, end_date)
    rows = await builder(db, start, end)

    output = io.StringIO()
    fieldnames: list[str] = []
    for row in rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)
    writer = csv.DictWriter(output, fieldnames=fieldnames or ["value"])
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    output.seek(0)

    filename = f"{report_type}_{start.date().isoformat()}_{(end - timedelta(days=1)).date().isoformat()}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
