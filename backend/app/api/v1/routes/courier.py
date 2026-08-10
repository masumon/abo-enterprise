"""Courier status synchronization endpoints.

Steadfast currently exposes authenticated status-by-identifier APIs. This
module uses those real provider responses to synchronize the local order state.
It never creates or invents tracking identifiers and never treats an arbitrary
admin-entered tracking string as proof that a shipment exists.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.security import require_role
from app.core.steadfast import SteadfastError, lookup_status
from app.models.models import ActivityLog, Order
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/courier", tags=["courier"])


_TERMINAL_PROVIDER_STATUSES = {"delivered", "cancelled"}


def _map_provider_status(provider_status: str, current_order_status: str) -> str:
    """Map only authoritative provider states to local order states.

    Non-terminal Steadfast states prove that the shipment exists but do not
    prove delivery. Once a courier shipment exists, those states therefore map
    to `shipped` unless the local order is already terminal.
    """
    status = provider_status.strip().lower()
    if status == "delivered":
        return "delivered"
    if status == "cancelled":
        return "cancelled"
    if current_order_status in {"delivered", "cancelled"}:
        return current_order_status
    return "shipped"


async def _get_order(order_id: uuid.UUID, db: AsyncSession) -> Order:
    order = (await db.execute(select(Order).where(Order.id == order_id, Order.is_deleted == False))).scalar_one_or_none()  # noqa: E712
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.courier_provider != "steadfast":
        raise HTTPException(status_code=400, detail="This order is not linked to Steadfast.")
    if not order.courier_tracking_id and not order.courier_consignment_id:
        raise HTTPException(status_code=400, detail="This order has no verified Steadfast shipment identifier.")
    return order


async def _sync_order(order: Order, db: AsyncSession, admin_id: str | None = None) -> dict:
    provider = await lookup_status(
        db,
        tracking_code=order.courier_tracking_id,
        consignment_id=order.courier_consignment_id,
        invoice=order.order_number,
    )
    old_status = order.order_status
    new_status = _map_provider_status(provider["delivery_status"], old_status)
    if new_status != old_status:
        order.order_status = new_status
        if admin_id:
            db.add(ActivityLog(
                admin_id=uuid.UUID(admin_id),
                action="courier_status_sync",
                entity_type="order",
                entity_id=order.id,
                old_values={"order_status": old_status},
                new_values={
                    "order_status": new_status,
                    "courier_status": provider["delivery_status"],
                },
            ))
        else:
            # Automated/public sync has no admin actor; retain an auditable event
            # without inventing an administrator identity.
            db.add(ActivityLog(
                action="courier_status_sync",
                entity_type="order",
                entity_id=order.id,
                old_values={"order_status": old_status},
                new_values={
                    "order_status": new_status,
                    "courier_status": provider["delivery_status"],
                },
            ))
    await db.commit()
    await db.refresh(order)
    return {
        "order_id": str(order.id),
        "order_number": order.order_number,
        "courier_provider": order.courier_provider,
        "tracking_id": order.courier_tracking_id,
        "consignment_id": order.courier_consignment_id,
        "provider_status": provider["delivery_status"],
        "order_status": order.order_status,
        "changed": new_status != old_status,
    }


@router.post(
    "/orders/{order_id}/steadfast/sync",
    response_model=ApiResponse,
    dependencies=[Depends(rate_limit("courier_status_sync", 30, 300))],
)
async def sync_steadfast_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("orders.write")),
):
    """Fetch the real Steadfast status and synchronize the local order."""
    order = await _get_order(order_id, db)
    try:
        data = await _sync_order(order, db, admin_id)
    except SteadfastError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ApiResponse(data=data, message="Steadfast status synchronized from the provider")


@router.get("/track", response_model=ApiResponse)
async def live_courier_tracking(
    order: str = Query(..., min_length=6, max_length=50),
    db: AsyncSession = Depends(get_db),
):
    """Public live courier status for a known ABO order number.

    The endpoint returns only courier status metadata; it does not expose the
    provider response body or credentials. The existing order tracking endpoint
    remains the source for order/payment details.
    """
    row = (await db.execute(
        select(Order).where(Order.order_number == order, Order.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    if row.courier_provider != "steadfast" or not row.courier_tracking_id:
        return ApiResponse(data={"available": False, "provider": row.courier_provider, "status": None})
    try:
        provider = await lookup_status(db, tracking_code=row.courier_tracking_id)
    except SteadfastError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return ApiResponse(data={
        "available": True,
        "provider": "steadfast",
        "tracking_id": row.courier_tracking_id,
        "status": provider["delivery_status"],
    })
