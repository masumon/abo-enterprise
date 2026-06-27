import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import Product, Order, Lead, LeadV2
from app.schemas.schemas import BulkOrderStatusUpdate, ApiResponse

router = APIRouter(prefix="/admin/bulk", tags=["bulk"])

VALID_ORDER_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}


# ── BULK STATUS UPDATE ────────────────────────────────────────────────────────

@router.post("/orders/status", response_model=ApiResponse)
async def bulk_update_order_status(
    payload: BulkOrderStatusUpdate,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update status on multiple orders in one request (admin only)"""
    if payload.status not in VALID_ORDER_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_ORDER_STATUSES))}",
        )
    if not payload.order_ids:
        raise HTTPException(status_code=422, detail="order_ids must not be empty")

    result = await db.execute(
        update(Order)
        .where(and_(Order.id.in_(payload.order_ids), Order.is_deleted == False))
        .values(order_status=payload.status)
        .returning(Order.id)
    )
    updated_ids = [str(r[0]) for r in result.fetchall()]
    await db.commit()

    return ApiResponse(
        data={"updated": len(updated_ids), "ids": updated_ids},
        message=f"{len(updated_ids)} order(s) updated to '{payload.status}'",
    )


# ── CSV EXPORT ────────────────────────────────────────────────────────────────

@router.get("/export/orders")
async def export_orders(
    days: int = Query(30, ge=1, le=365),
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export orders to CSV (admin only)"""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Order)
        .where(and_(Order.created_at >= since, Order.is_deleted == False))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "order_number", "customer_name", "customer_phone", "customer_email",
        "delivery_address", "payment_method", "payment_status", "order_status",
        "subtotal", "delivery_charge", "total", "notes", "created_at",
    ])
    for o in orders:
        writer.writerow([
            o.order_number, o.customer_name, o.customer_phone, o.customer_email or "",
            o.delivery_address, o.payment_method, o.payment_status, o.order_status,
            float(o.subtotal), float(o.delivery_charge), float(o.total),
            o.notes or "", o.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_last_{days}days.csv"},
    )


@router.get("/export/leads")
async def export_leads(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export leads to CSV (admin only)"""
    result = await db.execute(
        select(Lead).where(Lead.is_deleted == False).order_by(Lead.created_at.desc())
    )
    leads = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "name", "phone", "email", "company", "lead_type",
        "budget_range", "project_description", "status", "source", "created_at",
    ])
    for l in leads:
        writer.writerow([
            l.name, l.phone, l.email or "", l.company or "", l.lead_type,
            l.budget_range or "", l.project_description or "",
            l.status, l.source, l.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


@router.get("/export/bookings")
async def export_bookings(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export bookings to CSV (admin only)"""
    from app.models.models import Booking
    result = await db.execute(
        select(Booking).where(Booking.is_deleted == False).order_by(Booking.created_at.desc())
    )
    bookings = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "booking_number", "customer_name", "customer_phone", "customer_email",
        "service_type", "service_subtype", "details", "status", "created_at",
    ])
    for b in bookings:
        writer.writerow([
            b.booking_number, b.customer_name, b.customer_phone, b.customer_email or "",
            b.service_type, b.service_subtype or "", b.details or "",
            b.status, b.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bookings.csv"},
    )


@router.get("/export/products")
async def export_products(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export products to CSV (admin only)"""
    result = await db.execute(
        select(Product).where(Product.is_deleted == False).order_by(Product.name_en)
    )
    products = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "slug", "name_en", "name_bn", "price", "original_price",
        "category", "stock_quantity", "is_active", "is_featured",
    ])
    for p in products:
        writer.writerow([
            p.slug, p.name_en, p.name_bn, float(p.price),
            float(p.original_price) if p.original_price else "",
            p.category, p.stock_quantity, p.is_active, p.is_featured,
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"},
    )


# ── CSV IMPORT ────────────────────────────────────────────────────────────────

@router.post("/import/products", response_model=ApiResponse)
async def import_products(
    file: UploadFile = File(...),
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Bulk import/update products from CSV (admin only)"""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created, updated, errors = 0, 0, []

    for row_num, row in enumerate(reader, start=2):
        try:
            slug = row.get("slug", "").strip()
            if not slug:
                errors.append({"row": row_num, "error": "slug is required"})
                continue

            existing_result = await db.execute(select(Product).where(Product.slug == slug))
            existing = existing_result.scalar_one_or_none()

            if existing:
                existing.stock_quantity = int(row.get("stock_quantity", existing.stock_quantity))
                existing.price = float(row.get("price", existing.price))
                updated += 1
            else:
                product = Product(
                    slug=slug,
                    name_en=row.get("name_en", slug),
                    name_bn=row.get("name_bn", slug),
                    price=float(row.get("price", 0)),
                    original_price=float(row["original_price"]) if row.get("original_price") else None,
                    category=row.get("category", "general"),
                    stock_quantity=int(row.get("stock_quantity", 0)),
                    is_active=str(row.get("is_active", "true")).lower() == "true",
                    is_featured=str(row.get("is_featured", "false")).lower() == "true",
                )
                db.add(product)
                created += 1
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    await db.commit()
    return ApiResponse(
        data={"created": created, "updated": updated, "errors": errors},
        message=f"Import complete: {created} created, {updated} updated",
    )
