import secrets
import uuid
from uuid import UUID
from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.security import require_admin, require_customer, require_role
from app.core.config import settings
from app.core.email import send_email, order_notification_html, customer_order_confirmation_html, customer_order_status_html
from app.core.invoice import InvoiceService
from app.models.models import Order, OrderItem, Product, ActivityLog
from app.schemas.schemas import OrderCreate, OrderOut, OrderStatusUpdate, OrderCourierUpdate, ApiResponse, PaginatedResponse, PaginatedMeta

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


def generate_order_number() -> str:
    now = datetime.now()
    return f"ABO-{now.year}{now.month:02d}-{secrets.token_hex(3).upper()}"


async def _validate_and_reserve_stock(db: AsyncSession, items: list) -> dict[str, float]:
    """Validate stock, decrement quantities, and return the SERVER-trusted
    unit price per line (keyed by list index) taken from the database.

    Client-supplied prices are never trusted for the money math — only used
    as a fallback for custom line items that have no matching product row.
    """
    trusted_prices: dict[str, float] = {}
    for idx, item_data in enumerate(items):
        if not item_data.product_id:
            trusted_prices[str(idx)] = float(item_data.product_price)
            continue
        try:
            product_uuid = UUID(str(item_data.product_id))
        except (ValueError, TypeError):
            trusted_prices[str(idx)] = float(item_data.product_price)
            continue
        result = await db.execute(
            select(Product)
            .where(
                Product.id == product_uuid,
                Product.is_deleted == False,  # noqa: E712
                Product.is_active == True,  # noqa: E712
            )
            .with_for_update()
        )
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product not found: {item_data.product_name}",
            )
        if product.stock_quantity < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name_en}. Available: {product.stock_quantity}",
            )
        product.stock_quantity -= item_data.quantity
        trusted_prices[str(idx)] = float(product.price)
    return trusted_prices


async def _server_side_discount(db: AsyncSession, coupon_code: str | None, subtotal: float) -> float:
    """Re-derive the coupon discount from admin-configured coupon rules.

    Mirrors the /public/coupons/validate logic so a tampered discount_amount
    in the request body can never exceed what the coupon actually grants.
    Returns 0 for missing/invalid/expired coupons or unmet minimums.
    """
    if not coupon_code:
        return 0.0
    from app.api.v1.routes.coupons import _load_coupons
    coupons = await _load_coupons(db)
    entry = coupons.get(coupon_code.strip().upper())
    if not entry or not entry.get("active", True):
        return 0.0
    if subtotal < float(entry.get("min_subtotal", 0)):
        return 0.0
    rate = float(entry.get("discount_percent", entry.get("discount_rate", 0)))
    if rate > 1:
        rate = rate / 100
    return float(round(subtotal * rate))


@router.post(
    "",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("orders_create", 15, 600))],
)
async def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    trusted_prices = await _validate_and_reserve_stock(db, payload.items)

    # ---- Server-authoritative money math (never trust client totals) ----
    trusted_subtotal = float(sum(
        trusted_prices[str(idx)] * item.quantity for idx, item in enumerate(payload.items)
    ))
    trusted_discount = await _server_side_discount(db, payload.coupon_code, trusted_subtotal)
    # Delivery charge depends on admin zone settings computed client-side; the
    # attack surface (arbitrary grand total) is closed by deriving total from
    # trusted subtotal/discount. Clamp delivery to a non-negative number.
    trusted_delivery = max(0.0, float(payload.delivery_charge or 0))
    trusted_total = trusted_subtotal - trusted_discount + trusted_delivery

    order = Order(
        order_number=generate_order_number(),
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        delivery_address=payload.delivery_address,
        payment_method=payload.payment_method,
        payment_number=payload.payment_number,
        subtotal=trusted_subtotal,
        discount_amount=trusted_discount,
        coupon_code=payload.coupon_code,
        delivery_charge=trusted_delivery,
        total=trusted_total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for idx, item_data in enumerate(payload.items):
        unit_price = trusted_prices[str(idx)]
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id if item_data.product_id else None,
            product_name=item_data.product_name,
            product_price=unit_price,
            quantity=item_data.quantity,
            subtotal=unit_price * item_data.quantity,
        )
        db.add(item)

    await db.flush()

    # Reload with items relationship to avoid async lazy-load error
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    order = result.scalar_one()
    await db.commit()

    # Send admin notification
    if settings.ADMIN_NOTIFY_EMAIL:
        items_summary = ", ".join(f"{i.product_name} x{i.quantity}" for i in payload.items)
        phone_digits = payload.customer_phone.replace("+", "").replace(" ", "")
        if phone_digits.startswith("0"):
            wa_phone = f"880{phone_digits[1:]}"
        elif not phone_digits.startswith("880"):
            wa_phone = f"880{phone_digits}"
        else:
            wa_phone = phone_digits
        wa_msg = (
            f"Hello {payload.customer_name}, your order {order.order_number} "
            f"at ABO Enterprise (৳{float(order.total):,.0f}) has been received. "
            f"We will confirm shortly. Thank you!"
        )
        customer_wa_url = f"https://wa.me/{wa_phone}?text={quote(wa_msg)}"
        admin_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin/orders"
        html = order_notification_html(
            order.order_number,
            payload.customer_name,
            payload.customer_phone,
            float(order.total),
            items_summary,
            payment_method=payload.payment_method,
            admin_orders_url=admin_url,
            customer_whatsapp_url=customer_wa_url,
        )
        background_tasks.add_task(
            send_email, settings.ADMIN_NOTIFY_EMAIL,
            f"New Order {order.order_number} — ABO Enterprise", html,
        )

    # Send customer confirmation email
    if payload.customer_email:
        items = [
            {"name": i.product_name, "quantity": i.quantity, "price": trusted_prices[str(idx)]}
            for idx, i in enumerate(payload.items)
        ]
        html = customer_order_confirmation_html(
            order.order_number,
            payload.customer_name,
            items,
            float(order.total),
            settings.WHATSAPP_NUMBER,
        )
        background_tasks.add_task(
            send_email, payload.customer_email,
            f"Order Confirmation #{order.order_number} — ABO Enterprise", html,
        )

    invoice_id = None
    try:
        invoice = await InvoiceService(db).create_order_invoice(order_id=order.id)
        invoice_id = str(invoice.id)
    except Exception:
        await db.rollback()
        logger.exception("Auto invoice for order %s failed", order.order_number)

    return ApiResponse(
        data={
            "order_id": str(order.id),
            "order_number": order.order_number,
            "invoice_id": invoice_id,
        },
        message="Order placed successfully! Check your email for confirmation."
    )


# Public order tracking endpoint
@router.get("/track", response_model=ApiResponse)
async def track_order(
    number: str = Query(..., description="Order number e.g. ABO-202406-1234"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.order_number == number, Order.is_deleted == False)  # noqa: E712
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return ApiResponse(data={
        "order_number": order.order_number,
        "order_status": order.order_status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "total": float(order.total),
        "items_count": len(order.items),
        "created_at": order.created_at.isoformat(),
        "courier_provider": order.courier_provider,
        "courier_tracking_id": order.courier_tracking_id,
    })


@router.get("/by-phone", response_model=ApiResponse)
async def orders_by_phone(
    phone: str | None = Query(None, description="Deprecated — phone now comes from the OTP token"),
    verified_phone: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Order history for the OTP-verified customer.

    The phone number is taken from the customer token issued by
    /customer/verify-otp — a bare phone number is no longer enough to read
    someone's order history. The legacy ?phone= param is accepted only if it
    matches the verified number.
    """
    if phone and phone != verified_phone:
        raise HTTPException(status_code=403, detail="Phone does not match verified session")
    phone = verified_phone
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(Order.customer_phone == phone, Order.is_deleted == False)  # noqa: E712
        .order_by(Order.created_at.desc())
        .limit(20)
    )
    orders = result.scalars().all()
    return ApiResponse(data=[
        {
            "order_number": o.order_number,
            "order_status": o.order_status,
            "total": float(o.total),
            "items_count": len(o.items),
            "created_at": o.created_at.isoformat(),
        }
        for o in orders
    ])


@router.get("", response_model=PaginatedResponse)
async def list_orders(
    order_status: str | None = Query(None),
    search: str | None = Query(None),
    days: int | None = Query(None, ge=1, le=365, description="Only orders from the last N days"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = [Order.is_deleted == False]  # noqa: E712
    if order_status:
        conditions.append(Order.order_status == order_status)
    if days:
        from datetime import timedelta
        conditions.append(Order.created_at >= datetime.now(timezone.utc) - timedelta(days=days))
    if search:
        q = f"%{search}%"
        conditions.append(or_(
            Order.customer_name.ilike(q),
            Order.customer_phone.ilike(q),
            Order.order_number.ilike(q),
        ))

    total = (await db.execute(select(func.count(Order.id)).where(and_(*conditions)))).scalar_one()
    result = await db.execute(
        select(Order).options(selectinload(Order.items))
        .where(and_(*conditions))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    orders = result.scalars().all()
    return PaginatedResponse(
        data=[OrderOut.model_validate(o) for o in orders],
        meta=PaginatedMeta(page=page, per_page=per_page, total=total, total_pages=-(-total // per_page)),
    )


@router.get("/{order_id}", response_model=ApiResponse)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return ApiResponse(data=OrderOut.model_validate(order))


@router.patch("/{order_id}/status", response_model=ApiResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("orders.write")),
):
    valid_statuses = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    old_status = order.order_status
    order.order_status = payload.status

    # Auto-confirm paid orders when moving to processing
    if payload.status == "processing" and order.payment_status == "completed":
        order.order_status = "processing"

    if payload.status == "cancelled" and old_status != "cancelled":
        for item in order.items:
            if item.product_id:
                prod_result = await db.execute(select(Product).where(Product.id == item.product_id))
                product = prod_result.scalar_one_or_none()
                if product:
                    product.stock_quantity += item.quantity

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="order",
        entity_id=order.id,
        old_values={"order_status": old_status},
        new_values={"order_status": order.order_status},
    )
    db.add(log)
    await db.commit()
    await db.refresh(order)

    # Notify customer on real status change (skip pending → pending noise)
    notify_statuses = {"confirmed", "processing", "shipped", "delivered", "cancelled"}
    if (
        order.customer_email
        and old_status != order.order_status
        and order.order_status in notify_statuses
    ):
        track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?order={order.order_number}"
        html = customer_order_status_html(
            order.order_number,
            order.customer_name,
            order.order_status,
            total=float(order.total),
            courier_provider=order.courier_provider,
            tracking_id=order.courier_tracking_id,
            track_url=track_url,
        )
        subject_map = {
            "confirmed": f"Order Confirmed #{order.order_number} — ABO Enterprise",
            "processing": f"Order In Processing #{order.order_number} — ABO Enterprise",
            "shipped": f"Order Shipped #{order.order_number} — ABO Enterprise",
            "delivered": f"Order Delivered #{order.order_number} — ABO Enterprise",
            "cancelled": f"Order Cancelled #{order.order_number} — ABO Enterprise",
        }
        background_tasks.add_task(send_email, order.customer_email, subject_map[order.order_status], html)

    return ApiResponse(data=OrderOut.model_validate(order), message="Order status updated")


@router.patch("/{order_id}/courier", response_model=ApiResponse)
async def update_order_courier(
    order_id: UUID,
    payload: OrderCourierUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_role("orders.write")),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    old_status = order.order_status
    if payload.courier_provider is not None:
        order.courier_provider = payload.courier_provider or None
    if payload.courier_tracking_id is not None:
        order.courier_tracking_id = payload.courier_tracking_id or None
    if order.courier_tracking_id and order.order_status in ("confirmed", "processing"):
        order.order_status = "shipped"
    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="order",
        entity_id=order.id,
        old_values={},
        new_values={
            "courier_provider": order.courier_provider,
            "courier_tracking_id": order.courier_tracking_id,
        },
    )
    db.add(log)
    await db.commit()
    await db.refresh(order)

    # When courier data lifts the order to "shipped", email the tracking ID
    if (
        order.customer_email
        and old_status != order.order_status
        and order.order_status == "shipped"
    ):
        track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?order={order.order_number}"
        html = customer_order_status_html(
            order.order_number,
            order.customer_name,
            "shipped",
            total=float(order.total),
            courier_provider=order.courier_provider,
            tracking_id=order.courier_tracking_id,
            track_url=track_url,
        )
        background_tasks.add_task(
            send_email, order.customer_email,
            f"Order Shipped #{order.order_number} — ABO Enterprise", html,
        )

    return ApiResponse(data=OrderOut.model_validate(order), message="Courier info updated")
