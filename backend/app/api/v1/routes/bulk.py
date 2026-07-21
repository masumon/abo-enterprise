import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from app.core.database import get_db
from app.core.security import require_admin, require_role
from app.models.models import Product, Order, LeadV2, BookingV2
from app.schemas.schemas import BulkOrderStatusUpdate, ApiResponse

router = APIRouter(prefix="/admin/bulk", tags=["bulk"])

VALID_ORDER_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
MAX_EXPORT_ROWS = 2000  # Limit exports to protect Render free-tier memory


# ── BULK STATUS UPDATE ────────────────────────────────────────────────────────

@router.post("/orders/status", response_model=ApiResponse)
async def bulk_update_order_status(
    payload: BulkOrderStatusUpdate,
    admin_id: str = Depends(require_role("orders.write")),
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
        .limit(MAX_EXPORT_ROWS)
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
    """Export service leads (v2) to CSV (admin only)"""
    result = await db.execute(
        select(LeadV2).where(LeadV2.is_deleted == False).order_by(LeadV2.created_at.desc()).limit(MAX_EXPORT_ROWS)
    )
    leads = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "lead_number", "name", "phone", "email", "company", "lead_type",
        "budget_range", "project_description", "status", "qualification_score",
        "source", "created_at",
    ])
    for l in leads:
        writer.writerow([
            l.lead_number, l.name, l.phone, l.email or "", l.company or "", l.lead_type,
            l.budget_range or "", l.project_description or "",
            l.status, l.qualification_score, l.source, l.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=service-leads.csv"},
    )


@router.get("/export/bookings")
async def export_bookings(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export service bookings (v2) to CSV (admin only)"""
    result = await db.execute(
        select(BookingV2).where(BookingV2.is_deleted == False).order_by(BookingV2.created_at.desc()).limit(MAX_EXPORT_ROWS)
    )
    bookings = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "booking_number", "service_name", "service_tier", "customer_name", "customer_phone",
        "customer_email", "pricing_type", "quoted_price", "final_price", "status",
        "payment_status", "payment_method", "details", "created_at",
    ])
    for b in bookings:
        writer.writerow([
            b.booking_number, b.service_name, b.service_tier or "",
            b.customer_name, b.customer_phone, b.customer_email or "",
            b.pricing_type,
            float(b.quoted_price) if b.quoted_price is not None else "",
            float(b.final_price) if b.final_price is not None else "",
            b.status, b.payment_status, b.payment_method or "",
            b.details or "", b.created_at.isoformat(),
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=service-bookings.csv"},
    )


@router.get("/export/products")
async def export_products(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export products to CSV (admin only)"""
    result = await db.execute(
        select(Product).where(Product.is_deleted == False).order_by(Product.name_en).limit(MAX_EXPORT_ROWS)
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


# ── PDF EXPORT ────────────────────────────────────────────────────────────────
# Mirrors each CSV export as a branded PDF table (same filters, same data).

def _pdf_response(pdf: bytes, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _dt(d) -> str:
    return d.strftime("%d %b %Y") if d else ""


@router.get("/export/orders/pdf")
async def export_orders_pdf(
    days: int = Query(30, ge=1, le=365),
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export orders as a PDF report (admin only) — same data as the CSV."""
    from app.core.pdf_report import build_table_report

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Order)
        .where(and_(Order.created_at >= since, Order.is_deleted == False))
        .order_by(Order.created_at.desc())
        .limit(MAX_EXPORT_ROWS)
    )
    orders = result.scalars().all()
    total_sum = sum(float(o.total) for o in orders)
    rows = [
        [o.order_number, o.customer_name, o.customer_phone, o.payment_method,
         o.payment_status, o.order_status, f"{float(o.total):,.0f}", _dt(o.created_at)]
        for o in orders
    ]
    pdf = build_table_report(
        f"Orders — Last {days} Days",
        ["Order #", "Customer", "Phone", "Payment", "Pay Status", "Status", "Total (Tk)", "Date"],
        rows,
        subtitle=f"{len(rows)} orders · Total Tk {total_sum:,.0f}",
        col_widths=[0.14, 0.18, 0.12, 0.10, 0.10, 0.10, 0.12, 0.14],
    )
    return _pdf_response(pdf, f"orders_last_{days}days.pdf")


@router.get("/export/leads/pdf")
async def export_leads_pdf(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export service leads as a PDF report (admin only)."""
    from app.core.pdf_report import build_table_report

    result = await db.execute(
        select(LeadV2).where(LeadV2.is_deleted == False).order_by(LeadV2.created_at.desc()).limit(MAX_EXPORT_ROWS)
    )
    leads = result.scalars().all()
    rows = [
        [l.lead_number, l.name, l.phone, l.email or "", (l.lead_type or "").replace("_", " "),
         l.budget_range or "", l.status, str(l.qualification_score), _dt(l.created_at)]
        for l in leads
    ]
    pdf = build_table_report(
        "Service Leads",
        ["Lead #", "Name", "Phone", "Email", "Type", "Budget", "Status", "Score", "Date"],
        rows,
        col_widths=[0.12, 0.15, 0.11, 0.16, 0.12, 0.10, 0.08, 0.06, 0.10],
    )
    return _pdf_response(pdf, "service-leads.pdf")


@router.get("/export/bookings/pdf")
async def export_bookings_pdf(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export service bookings as a PDF report (admin only)."""
    from app.core.pdf_report import build_table_report

    result = await db.execute(
        select(BookingV2).where(BookingV2.is_deleted == False).order_by(BookingV2.created_at.desc()).limit(MAX_EXPORT_ROWS)
    )
    bookings = result.scalars().all()
    rows = [
        [b.booking_number, b.service_name, b.customer_name, b.customer_phone,
         f"{float(b.quoted_price):,.0f}" if b.quoted_price is not None else "—",
         b.status, b.payment_status, _dt(b.created_at)]
        for b in bookings
    ]
    pdf = build_table_report(
        "Service Bookings",
        ["Booking #", "Service", "Customer", "Phone", "Quoted (Tk)", "Status", "Payment", "Date"],
        rows,
        col_widths=[0.13, 0.19, 0.15, 0.12, 0.11, 0.10, 0.10, 0.10],
    )
    return _pdf_response(pdf, "service-bookings.pdf")


@router.get("/export/products/pdf")
async def export_products_pdf(
    _admin: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Export products as a PDF report (admin only)."""
    from app.core.pdf_report import build_table_report

    result = await db.execute(
        select(Product).where(Product.is_deleted == False).order_by(Product.name_en).limit(MAX_EXPORT_ROWS)
    )
    products = result.scalars().all()
    rows = [
        [p.name_en, p.category, f"{float(p.price):,.0f}",
         f"{float(p.original_price):,.0f}" if p.original_price else "—",
         str(p.stock_quantity), "Yes" if p.is_active else "No", "Yes" if p.is_featured else "No"]
        for p in products
    ]
    pdf = build_table_report(
        "Products Catalog",
        ["Product", "Category", "Price (Tk)", "Original (Tk)", "Stock", "Active", "Featured"],
        rows,
        col_widths=[0.30, 0.14, 0.12, 0.12, 0.10, 0.11, 0.11],
    )
    return _pdf_response(pdf, "products.pdf")
