"""Courier status synchronization endpoints.

Steadfast currently exposes authenticated status-by-identifier APIs. This
module uses those real provider responses to synchronize the local order state.
It never creates or invents tracking identifiers and never treats an arbitrary
admin-entered tracking string as proof that a shipment exists.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.email import customer_order_status_html, send_email
from app.core.rate_limit import rate_limit
from app.core.security import require_role
from app.core.site_url import resolve_site_url
from app.core.steadfast import SteadfastError, lookup_status
from app.models.models import ActivityLog, Order
from app.schemas.schemas import ApiResponse, OrderCourierUpdate, OrderOut

router = APIRouter(prefix="/courier", tags=["courier"])


def _map_provider_status(provider_status: str, current_order_status: str) -> str:
    """Map authoritative provider states to local order states."""
    status = provider_status.strip().lower()
    if status == "delivered":
        return "delivered"
    if status == "cancelled":
        return "cancelled"
    if current_order_status in {"delivered", "cancelled"}:
        return current_order_status
    return "shipped"


async def _get_order(order_id: uuid.UUID, db: AsyncSession) -> Order:
    order = (await db.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.courier_provider != "steadfast":
        raise HTTPException(status_code=400, detail="This order is not linked to Steadfast.")
    if not order.courier_tracking_id and not order.courier_consignment_id:
        raise HTTPException(status_code=400, detail="This order has no verified Steadfast shipment identifier.")
    return order


async def _sync_order(order: Order, db: AsyncSession, admin_id: str) -> dict:
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
        db.add(ActivityLog(
            admin_id=uuid.UUID(admin_id),
            action="courier_status_sync",
            entity_type="order",
            entity_id=order.id,
            old_values={"order_status": old_status},
            new_values={"order_status": new_status, "courier_status": provider["delivery_status"]},
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


@router.patch("/orders/{order_id}/courier", response_model=ApiResponse)
async def verified_courier_update(
    order_id: uuid.UUID,
    payload: OrderCourierUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("orders.write")),
):
    """Safe replacement for the legacy courier metadata endpoint.

    A Steadfast tracking ID is accepted only after Steadfast itself confirms it.
    Other provider names may be stored as metadata, but they never transition
    an order to `shipped` because no real provider integration exists for them.
    """
    order = (await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    provider = (payload.courier_provider or order.courier_provider or "").strip().lower() or None
    tracking_id = (payload.courier_tracking_id or "").strip() or None
    old_status = order.order_status
    provider_status = None
    verified_consignment = None

    if tracking_id and provider == "steadfast":
        try:
            provider_result = await lookup_status(db, tracking_code=tracking_id)
        except SteadfastError as exc:
            raise HTTPException(status_code=502, detail=f"Steadfast tracking verification failed: {exc}") from exc
        provider_status = provider_result["delivery_status"]
        verified_consignment = provider_result.get("consignment_id")
        order.courier_tracking_id = tracking_id
        order.courier_provider = "steadfast"
        if verified_consignment is not None:
            order.courier_consignment_id = str(verified_consignment)
        if order.order_status not in {"delivered", "cancelled"}:
            order.order_status = _map_provider_status(provider_status, order.order_status)
    else:
        order.courier_provider = provider
        order.courier_tracking_id = tracking_id
        # Do not promote a manually entered non-integrated courier to shipped.

    db.add(ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="courier_update",
        entity_type="order",
        entity_id=order.id,
        old_values={"order_status": old_status},
        new_values={
            "courier_provider": order.courier_provider,
            "courier_tracking_id": order.courier_tracking_id,
            "courier_consignment_id": order.courier_consignment_id,
            "provider_status": provider_status,
        },
    ))
    await db.commit()
    await db.refresh(order)

    if order.customer_email and old_status != order.order_status and order.order_status in {"shipped", "delivered", "cancelled"}:
        track_url = f"{await resolve_site_url(db)}/track?order={order.order_number}"
        html = customer_order_status_html(
            order.order_number,
            order.customer_name,
            order.order_status,
            total=float(order.total),
            courier_provider=order.courier_provider,
            tracking_id=order.courier_tracking_id,
            track_url=track_url,
        )
        background_tasks.add_task(
            send_email,
            order.customer_email,
            f"Order {order.order_status.title()} #{order.order_number} — ABO Enterprise",
            html,
        )

    message = "Courier information updated."
    if provider == "steadfast" and provider_status:
        message = f"Steadfast tracking verified ({provider_status}) and order synchronized."
    elif provider and provider != "steadfast" and tracking_id:
        message = "Courier metadata saved; order status was not changed because this provider has no verified API integration."
    return ApiResponse(data=OrderOut.model_validate(order), message=message)


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
