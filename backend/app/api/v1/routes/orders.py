from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.config import settings
from app.core.email import send_email, order_notification_html
from app.models.models import Order, OrderItem
from app.schemas.schemas import OrderCreate, OrderOut, OrderStatusUpdate, ApiResponse, PaginatedResponse, PaginatedMeta

router = APIRouter(prefix="/orders", tags=["orders"])


def generate_order_number() -> str:
    now = datetime.now()
    return f"ABO-{now.year}{now.month:02d}-{now.microsecond % 10000:04d}"


@router.post("", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    order = Order(
        order_number=generate_order_number(),
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        delivery_address=payload.delivery_address,
        payment_method=payload.payment_method,
        payment_number=payload.payment_number,
        subtotal=payload.subtotal,
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
    await db.refresh(order)

    if settings.ADMIN_NOTIFY_EMAIL:
        items_summary = ", ".join(
            f"{i.product_name} x{i.quantity}" for i in payload.items
        )
        html = order_notification_html(
            order.order_number, payload.customer_name, payload.customer_phone,
            float(payload.total), items_summary,
        )
        background_tasks.add_task(
            send_email, settings.ADMIN_NOTIFY_EMAIL,
            f"New Order {order.order_number} — ABO Enterprise", html,
        )

    return ApiResponse(data=OrderOut.model_validate(order), message="Order placed successfully")


@router.get("", response_model=PaginatedResponse)
async def list_orders(
    order_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    conditions = [Order.is_deleted == False]  # noqa: E712
    if order_status:
        conditions.append(Order.order_status == order_status)

    total = (await db.execute(select(func.count(Order.id)).where(and_(*conditions)))).scalar_one()
    result = await db.execute(
        select(Order).where(and_(*conditions))
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
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return ApiResponse(data=OrderOut.model_validate(order))


@router.patch("/{order_id}/status", response_model=ApiResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    valid_statuses = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.order_status = payload.status
    return ApiResponse(data=OrderOut.model_validate(order), message="Order status updated")
