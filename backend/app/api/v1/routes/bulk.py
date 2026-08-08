import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from app.core.database import get_db
from app.core.security import require_admin, require_role
from app.core import product_import as pi
from app.core.taxonomy import load_categories, ancestors_of
from app.models.models import Product, Order, LeadV2, BookingV2, Category, ProductImportJob
from app.schemas.schemas import BulkOrderStatusUpdate, ApiResponse, ProductCreate, ProductUpdate

router = APIRouter(prefix="/admin/bulk", tags=["bulk"])

MAX_IMPORT_ROWS = 2000  # protect free-tier memory / a single request's work

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


# ══════════════════════════════════════════════════════════════════════════════
# BULK PRODUCT IMPORT — template, category tree, validate (dry-run), commit,
# history. Reuses ProductCreate validation and the existing Product model; the
# working single-product create/update endpoints and the storefront are
# untouched. slug is the primary key (create/update/skip); SKU duplicates are
# surfaced as warnings.
# ══════════════════════════════════════════════════════════════════════════════

_TEMPLATE_COLUMNS = list(pi.FIELD_SPEC.keys())
_TEMPLATE_EXAMPLE = {
    "slug": "sample-fast-charger",
    "name_en": "Sample Fast Charger 65W",
    "name_bn": "স্যাম্পল ফাস্ট চার্জার ৬৫W",
    "category": "chargers",
    "price": "1490",
    "original_price": "1990",
    "description_en": "65W GaN fast charger.",
    "description_bn": "৬৫W GaN ফাস্ট চার্জার।",
    "sku": "CHG-65W-001",
    "brand": "ABO",
    "stock_quantity": "25",
    "is_active": "true",
    "is_featured": "false",
    "image_url": "https://res.cloudinary.com/demo/image/upload/charger.jpg",
    "images": "https://res.cloudinary.com/demo/image/upload/charger-2.jpg | https://res.cloudinary.com/demo/image/upload/charger-3.jpg",
    "tags": "charger, fast, 65w",
}


@router.get("/import/products/template", dependencies=[Depends(require_role("products.write"))])
async def import_products_template(fmt: str = Query("csv", pattern="^(csv|xlsx)$")):
    """Download a ready-to-fill import template with the canonical columns and
    one example row. slug/name_en/name_bn/category/price are required for a NEW
    product; an existing slug only needs the columns you want to change."""
    example = [_TEMPLATE_EXAMPLE.get(c, "") for c in _TEMPLATE_COLUMNS]
    if fmt == "xlsx":
        try:
            from openpyxl import Workbook
        except ImportError:
            raise HTTPException(status_code=400, detail="Excel export unavailable (openpyxl not installed). Use CSV.")
        wb = Workbook()
        ws = wb.active
        ws.title = "Products"
        ws.append(_TEMPLATE_COLUMNS)
        ws.append(example)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=product-import-template.xlsx"},
        )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(_TEMPLATE_COLUMNS)
    writer.writerow(example)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=product-import-template.csv"},
    )


@router.get("/import/products/category-tree", dependencies=[Depends(require_role("products.read"))])
async def import_category_tree(db: AsyncSession = Depends(get_db)):
    """Download the current category tree as CSV so the admin uses exact,
    matchable category values in the import file (slug or full path)."""
    cats = await load_categories(db, include_inactive=True)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["slug", "name_en", "name_bn", "path", "parent_slug"])
    by_id = {c.id: c for c in cats}
    def _path(c: Category) -> str:
        chain = [a.name_en for a in ancestors_of(c, cats)] + [c.name_en]
        return " > ".join(chain)
    for c in sorted(cats, key=lambda x: _path(x).lower()):
        parent = by_id.get(c.parent_id) if c.parent_id else None
        writer.writerow([c.slug, c.name_en, c.name_bn or "", _path(c), parent.slug if parent else ""])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=category-tree.csv"},
    )


async def _run_import_pipeline(file: UploadFile, mapping_json: str | None, on_existing: str, on_new: str, db: AsyncSession):
    """Shared parse + map + validate used by both validate (dry-run) and commit.
    Returns (headers, auto_mapping, mapping_used, results)."""
    content = await file.read()
    try:
        headers, rows = pi.parse_file(file.filename or "", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not rows:
        raise HTTPException(status_code=400, detail="The file has no data rows.")
    if len(rows) > MAX_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail=f"Too many rows ({len(rows)}). Split into files of ≤{MAX_IMPORT_ROWS}.")

    auto_mapping = pi.auto_map_headers(headers)
    mapping_used = dict(auto_mapping)
    if mapping_json:
        import json
        try:
            override = json.loads(mapping_json)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="mapping must be valid JSON")
        if isinstance(override, dict):
            for h, fld in override.items():
                if h in mapping_used:
                    mapping_used[h] = (fld or None)

    cat_index = await pi.build_category_index(db)
    # Existing products for match (case as stored).
    existing = (await db.execute(
        select(Product.slug, Product.sku).where(Product.is_deleted == False)  # noqa: E712
    )).all()
    existing_slugs = {r[0] for r in existing if r[0]}
    existing_sku_to_slug = {r[1]: r[0] for r in existing if r[1]}

    results = pi.validate_rows(
        rows, mapping_used, cat_index, existing_slugs, existing_sku_to_slug,
        on_existing=on_existing, on_new=on_new,
    )
    return headers, auto_mapping, mapping_used, results


@router.post("/import/products/validate", response_model=ApiResponse, dependencies=[Depends(require_role("products.write"))])
async def import_products_validate(
    file: UploadFile = File(...),
    mapping: str | None = Form(None),
    on_existing: str = Form("update"),
    on_new: str = Form("create"),
    db: AsyncSession = Depends(get_db),
):
    """Dry-run: parse, auto-map columns, validate every row and match categories.
    Writes NOTHING to the database — returns a preview + per-row errors so the
    admin can fix the file before committing."""
    headers, auto_mapping, mapping_used, results = await _run_import_pipeline(file, mapping, on_existing, on_new, db)
    preview = [r.to_preview() for r in results]
    summary = {
        "total": len(results),
        "create": sum(1 for r in results if r.action == "create" and not r.errors),
        "update": sum(1 for r in results if r.action == "update" and not r.errors),
        "skip": sum(1 for r in results if r.action == "skip" or r.errors),
        "errors": sum(1 for r in results if r.errors),
        "warnings": sum(1 for r in results if r.warnings),
    }
    return ApiResponse(
        data={
            "headers": headers,
            "fields": _TEMPLATE_COLUMNS,
            "auto_mapping": auto_mapping,
            "mapping_used": mapping_used,
            "summary": summary,
            "rows": preview,
        },
        message="Validation complete (nothing saved yet)",
    )


@router.post("/import/products/commit", response_model=ApiResponse, dependencies=[Depends(require_role("products.write"))])
async def import_products_commit(
    file: UploadFile = File(...),
    mapping: str | None = Form(None),
    on_existing: str = Form("update"),
    on_new: str = Form("create"),
    _admin: str = Depends(require_role("products.write")),
    db: AsyncSession = Depends(get_db),
):
    """Apply the import: create new products and update existing ones (by slug),
    skipping rows with errors. Re-validates the file server-side (the preview is
    never trusted), records the run in Import History, and returns the result."""
    _, _, _, results = await _run_import_pipeline(file, mapping, on_existing, on_new, db)

    created = updated = skipped = 0
    error_report: list[dict] = []

    for r in results:
        # Rows that failed validation, or that the admin chose to skip, are never
        # applied — recorded (with any warnings) and moved past.
        if r.errors or r.action == "skip":
            skipped += 1
            if r.errors or r.warnings:
                error_report.append({"row": r.row_num, "slug": r.data.get("slug", ""), "errors": r.errors, "warnings": r.warnings})
            continue

        data = dict(r.data)
        # The update target is read outside the savepoint (a pure read).
        existing = None
        if r.action == "update":
            existing = (await db.execute(
                select(Product).where(Product.slug == data["slug"], Product.is_deleted == False)  # noqa: E712
            )).scalar_one_or_none()
            if not existing:
                skipped += 1
                error_report.append({"row": r.row_num, "slug": data.get("slug", ""), "errors": ["product vanished before commit"], "warnings": []})
                continue

        # Each row is applied inside its own SAVEPOINT + flush: a DB error that
        # only surfaces at write time (a constraint, an over-long value) rolls
        # back THIS row alone and is reported — the rest of the batch and the
        # already-applied rows are never corrupted or lost.
        try:
            async with db.begin_nested():
                if r.action == "create":
                    payload = ProductCreate(**{k: v for k, v in data.items() if k in ProductCreate.model_fields})
                    fields = payload.model_dump()
                    fields.pop("blog_ids", None)
                    product = Product(**fields)
                    if r.category_id is not None:
                        product.category_id = r.category_id
                    db.add(product)
                else:  # update — validate the incoming changes via ProductUpdate
                    upd = ProductUpdate(**{k: v for k, v in data.items() if k != "slug" and k in ProductUpdate.model_fields})
                    for k, v in upd.model_dump(exclude_unset=True).items():
                        setattr(existing, k, v)
                    if r.category_id is not None:
                        existing.category_id = r.category_id
                await db.flush()
            if r.action == "create":
                created += 1
            else:
                updated += 1
        except Exception as exc:  # noqa: BLE001 — one bad row must not abort the batch
            skipped += 1
            error_report.append({"row": r.row_num, "slug": data.get("slug", ""), "errors": [f"apply failed: {exc}"], "warnings": []})

    job = ProductImportJob(
        admin_id=uuid.UUID(_admin),
        filename=file.filename,
        total_rows=len(results),
        created_count=created,
        updated_count=updated,
        skipped_count=skipped,
        error_count=sum(1 for e in error_report if e.get("errors")),
        errors=error_report[:500],  # cap stored report
    )
    db.add(job)
    await db.commit()

    return ApiResponse(
        data={
            "job_id": str(job.id),
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": error_report,
        },
        message=f"Import complete: {created} created, {updated} updated, {skipped} skipped",
    )


@router.get("/import/products/history", response_model=ApiResponse, dependencies=[Depends(require_role("products.read"))])
async def import_products_history(db: AsyncSession = Depends(get_db)):
    """Recent bulk-import runs (newest first) for the Import History panel."""
    jobs = (await db.execute(
        select(ProductImportJob).order_by(ProductImportJob.created_at.desc()).limit(50)
    )).scalars().all()
    return ApiResponse(data=[
        {
            "id": str(j.id),
            "filename": j.filename,
            "total_rows": j.total_rows,
            "created": j.created_count,
            "updated": j.updated_count,
            "skipped": j.skipped_count,
            "errors": j.error_count,
            "error_report": j.errors or [],
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ])
