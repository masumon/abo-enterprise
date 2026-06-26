import csv
import io
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.models import Product, Order, LeadV2, BookingV2

router = APIRouter(prefix="/api/v1/admin/bulk", tags=["bulk"])


# ── EXPORT ──────────────────────────────────────────────

@router.get("/export/products")
async def export_products(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "slug", "name_en", "name_bn", "price", "original_price",
                     "category", "stock_quantity", "is_active", "is_featured"])
    for p in products:
        writer.writerow([p.id, p.slug, p.name_en, p.name_bn, p.price,
                         p.original_price, p.category, p.stock_quantity, p.is_active, p.is_featured])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products.csv"}
    )


@router.get("/export/orders")
async def export_orders(
    days: int = Query(30),
    db: Session = Depends(get_db)
):
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(days=days)
    orders = db.query(Order).filter(Order.created_at >= since, Order.is_deleted == False).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["order_number", "customer_name", "customer_phone", "customer_email",
                     "total", "payment_method", "payment_status", "order_status", "created_at"])
    for o in orders:
        writer.writerow([o.order_number, o.customer_name, o.customer_phone, o.customer_email,
                         o.total, o.payment_method, o.payment_status, o.order_status,
                         o.created_at.isoformat()])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_last_{days}days.csv"}
    )


@router.get("/export/leads")
async def export_leads(db: Session = Depends(get_db)):
    leads = db.query(LeadV2).filter(LeadV2.is_deleted == False).order_by(LeadV2.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["lead_number", "name", "phone", "email", "company", "lead_type",
                     "qualification_score", "status", "budget_min", "budget_max", "created_at"])
    for l in leads:
        writer.writerow([l.lead_number, l.name, l.phone, l.email, l.company, l.lead_type,
                         l.qualification_score, l.status, l.budget_min, l.budget_max,
                         l.created_at.isoformat()])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"}
    )


# ── IMPORT ──────────────────────────────────────────────

@router.post("/import/products")
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Bulk import products from CSV"""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created, skipped, errors = 0, 0, []

    for row_num, row in enumerate(reader, start=2):
        try:
            slug = row.get("slug", "").strip()
            if not slug:
                errors.append({"row": row_num, "error": "slug is required"})
                skipped += 1
                continue

            existing = db.query(Product).filter(Product.slug == slug).first()
            if existing:
                # Update stock & price
                existing.stock_quantity = int(row.get("stock_quantity", existing.stock_quantity))
                existing.price = float(row.get("price", existing.price))
                skipped += 1
            else:
                product = Product(
                    slug=slug,
                    name_en=row.get("name_en", slug),
                    name_bn=row.get("name_bn", slug),
                    price=float(row.get("price", 0)),
                    original_price=float(row["original_price"]) if row.get("original_price") else None,
                    category=row.get("category", "general"),
                    stock_quantity=int(row.get("stock_quantity", 0)),
                    is_active=row.get("is_active", "true").lower() == "true",
                    is_featured=row.get("is_featured", "false").lower() == "true",
                )
                db.add(product)
                created += 1
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})
            skipped += 1

    db.commit()
    return {
        "success": True,
        "data": {"created": created, "updated": skipped - len(errors), "errors": errors}
    }


@router.post("/import/leads")
async def import_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Bulk import leads from CSV"""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created, errors = 0, []

    for row_num, row in enumerate(reader, start=2):
        try:
            phone = row.get("phone", "").strip()
            if not phone:
                errors.append({"row": row_num, "error": "phone required"})
                continue

            year = datetime.now().year
            count = db.query(LeadV2).count()
            lead_number = f"LF-{year}-{count + 1:06d}"

            lead = LeadV2(
                lead_number=lead_number,
                name=row.get("name", "Unknown"),
                phone=phone,
                email=row.get("email"),
                company=row.get("company"),
                lead_type=row.get("lead_type", "general"),
                source=row.get("source", "csv_import"),
                project_description=row.get("project_description"),
                qualification_score=int(row.get("qualification_score", 0)),
                status=row.get("status", "new"),
                budget_min=float(row["budget_min"]) if row.get("budget_min") else None,
                budget_max=float(row["budget_max"]) if row.get("budget_max") else None,
            )
            db.add(lead)
            created += 1
        except Exception as e:
            errors.append({"row": row_num, "error": str(e)})

    db.commit()
    return {"success": True, "data": {"created": created, "errors": errors}}
