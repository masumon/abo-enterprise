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
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, order_notification_html, customer_order_confirmation_html
from app.core.invoice import InvoiceService
from app.models.models import Order, OrderItem, Product, ActivityLog
from app.schemas.schemas import OrderCreate, OrderOut, OrderStatusUpdate, OrderCourierUpdate, ApiResponse, PaginatedResponse, PaginatedMeta

import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


def generate_order_number() -> str:
    now = datetime.now()
    return f"ABO-{now.year}{now.month:02d}-{secrets.token_hex(3).upper()}"


async def _validate_and_reserve_stock(db: AsyncSession, items: list) -> None:
    """Validate stock availability and decrement quantities atomically."""
    for item_data in items:
        if not item_data.product_id:
            continue
        try:
            product_uuid = UUID(str(item_data.product_id))
        except (ValueError, TypeError):
            continue
        result = await db.execute(
            select(Product).where(
                Product.id == product_uuid,
                Product.is_deleted == False,  # noqa: E712
                Product.is_active == True,  # noqa: E712
            )
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


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    await _validate_and_reserve_stock(db, payload.items)

    order = Order(
        order_number=generate_order_number(),
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        delivery_address=payload.delivery_address,
        payment_method=payload.payment_method,
        payment_number=payload.payment_number,
        subtotal=payload.subtotal,
        discount_amount=payload.discount_amount or 0,
        coupon_code=payload.coupon_code,
        delivery_charge=payload.delivery_charge,
        total=payload.total,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for item_data in payload.items:
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id if item_data.product_id else None,
            product_name=item_data.product_name,
            product_price=item_data.product_price,
            quantity=item_data.quantity,
            subtotal=item_data.subtotal,
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
            f"at ABO Enterprise (৳{float(payload.total):,.0f}) has been received. "
            f"We will confirm shortly. Thank you!"
        )
        customer_wa_url = f"https://wa.me/{wa_phone}?text={quote(wa_msg)}"
        admin_url = f"{settings.FRONTEND_URL.rstrip('/')}/admin/orders"
        html = order_notification_html(
            order.order_number,
            payload.customer_name,
            payload.customer_phone,
            float(payload.total),
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
            {"name": i.product_name, "quantity": i.quantity, "price": float(i.product_price)}
            for i in payload.items
        ]
        html = customer_order_confirmation_html(
            order.order_number,
            payload.customer_name,
            items,
            float(payload.total),
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
    except Exception as exc:
        logger.warning("Auto invoice for order %s failed: %s", order.order_number, exc)

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
    phone: str = Query(..., description="Customer phone 01XXXXXXXXX"),
    db: AsyncSession = Depends(get_db),
):
    if not phone.startswith("0") or len(phone) != 11:
        raise HTTPException(status_code=400, detail="Invalid phone format")
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
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = [Order.is_deleted == False]  # noqa: E712
    if order_status:
        conditions.append(Order.order_status == order_status)
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
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
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
    return ApiResponse(data=OrderOut.model_validate(order), message="Order status updated")


@router.patch("/{order_id}/courier", response_model=ApiResponse)
async def update_order_courier(
    order_id: UUID,
    payload: OrderCourierUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
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
    return ApiResponse(data=OrderOut.model_validate(order), message="Courier info updated")
