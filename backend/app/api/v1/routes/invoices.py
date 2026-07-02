import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.core.security import require_admin
from app.core.invoice import InvoiceService
from app.models.models import Invoice, ActivityLog, BookingV2, Booking
from app.schemas.schemas import (
    InvoiceOut,
    InvoiceCreate,
    PaginatedResponse,
    PaginatedMeta,
    ApiResponse,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/invoices", tags=["invoices"])


async def _pdf_response(invoice: Invoice, db: AsyncSession) -> Response:
    invoice_service = InvoiceService(db)
    pdf_content = await invoice_service.generate_pdf(invoice)
    filename = f"{invoice.invoice_number}.pdf"
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==================== PUBLIC CUSTOMER INVOICE ====================

def _public_invoice_payload(invoice: Invoice, *, order=None, booking: BookingV2 | None = None) -> dict:
    """Customer-facing invoice details for the order/booking success page."""
    return {
        "invoice_number": invoice.invoice_number,
        "payment_method": invoice.payment_method,
        "payment_status": invoice.payment_status,
        "customer_name": invoice.customer_name,
        "customer_phone": invoice.customer_phone,
        "items": invoice.items or [],
        "subtotal": float(invoice.subtotal or 0),
        "tax": float(invoice.tax or 0),
        "total": float(invoice.total or 0),
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        "order_number": order.order_number if order else None,
        "order_status": order.order_status if order else None,
        "delivery_charge": float(order.delivery_charge or 0) if order else None,
        "courier_provider": order.courier_provider if order else None,
        "courier_tracking_id": order.courier_tracking_id if order else None,
        "booking_number": booking.booking_number if booking else None,
        "booking_status": booking.status if booking else None,
        "service_name": booking.service_name if booking else None,
    }


async def _get_order_for_customer(order_number: str, phone: str, db: AsyncSession):
    from app.models.models import Order

    result = await db.execute(
        select(Order).where(
            Order.order_number == order_number,
            Order.is_deleted == False,  # noqa: E712
        )
    )
    order = result.scalar_one_or_none()
    if not order or order.customer_phone != phone:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _get_booking_for_customer(booking_id: uuid.UUID, phone: str, db: AsyncSession) -> BookingV2:
    result = await db.execute(
        select(BookingV2).where(
            BookingV2.id == booking_id,
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )
    booking = result.scalar_one_or_none()
    if not booking or booking.customer_phone != phone:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/public/order/{order_number}", response_model=ApiResponse)
async def public_order_invoice(
    order_number: str,
    phone: str = Query(..., min_length=11, max_length=11),
    db: AsyncSession = Depends(get_db),
):
    """Invoice details for the order-success page — requires matching customer phone.

    Creates the invoice on the fly if checkout-time auto-creation failed,
    so the customer always sees one.
    """
    order = await _get_order_for_customer(order_number, phone, db)
    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_order_id(order.id)
    if not invoice:
        invoice = await invoice_service.create_order_invoice(order_id=order.id)
    return ApiResponse(data=_public_invoice_payload(invoice, order=order))


@router.get("/public/order/{order_number}/pdf")
async def public_order_invoice_pdf(
    order_number: str,
    phone: str = Query(..., min_length=11, max_length=11),
    db: AsyncSession = Depends(get_db),
):
    """Download order invoice PDF — requires matching customer phone."""
    order = await _get_order_for_customer(order_number, phone, db)
    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_order_id(order.id)
    if not invoice:
        invoice = await invoice_service.create_order_invoice(order_id=order.id)
    return await _pdf_response(invoice, db)


@router.get("/public/booking/{booking_id}", response_model=ApiResponse)
async def public_booking_invoice(
    booking_id: uuid.UUID,
    phone: str = Query(..., min_length=11, max_length=11),
    db: AsyncSession = Depends(get_db),
):
    """Invoice details for the booking-success page — requires matching customer phone."""
    booking = await _get_booking_for_customer(booking_id, phone, db)
    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_booking_v2_id(booking.id)
    if not invoice:
        invoice = await invoice_service.create_booking_invoice(booking_id=booking.id)
    return ApiResponse(data=_public_invoice_payload(invoice, booking=booking))


@router.get("/public/booking/{booking_id}/pdf")
async def public_booking_invoice_pdf(
    booking_id: uuid.UUID,
    phone: str = Query(..., min_length=11, max_length=11),
    db: AsyncSession = Depends(get_db),
):
    """Download booking invoice PDF — requires matching customer phone."""
    booking = await _get_booking_for_customer(booking_id, phone, db)
    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_booking_v2_id(booking.id)
    if not invoice:
        invoice = await invoice_service.create_booking_invoice(booking_id=booking.id)
    return await _pdf_response(invoice, db)


# ==================== INVOICE CRUD ====================

@router.post("", response_model=ApiResponse)
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    """Create invoice (admin only)"""
    invoice_service = InvoiceService(db)

    try:
        if payload.order_id:
            invoice = await invoice_service.create_order_invoice(
                order_id=payload.order_id,
                payment_method=payload.payment_method,
                notes=payload.notes,
            )
        elif payload.booking_id:
            invoice = await invoice_service.create_booking_invoice(
                booking_id=payload.booking_id,
                payment_method=payload.payment_method,
                notes=payload.notes,
            )
        else:
            from app.core.invoice import generate_invoice_number

            invoice_number = generate_invoice_number()
            invoice = Invoice(
                invoice_number=invoice_number,
                **payload.model_dump(exclude={"order_id", "booking_id"}),
            )
            db.add(invoice)
            await db.commit()
            await db.refresh(invoice)

        return ApiResponse(
            data=InvoiceOut.model_validate(invoice).model_dump(),
            message="Invoice created successfully",
        )
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{invoice_id}", response_model=ApiResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    """Get invoice details (admin only)"""
    result = await db.execute(
        select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.is_deleted == False)
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return ApiResponse(
        data=InvoiceOut.model_validate(invoice).model_dump(),
        message="Invoice fetched successfully",
    )


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: str = Depends(require_admin),
):
    """Download invoice/receipt PDF (admin auth required)"""
    result = await db.execute(
        select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.is_deleted == False)
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        return await _pdf_response(invoice, db)
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation not available. Install: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating PDF")


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/invoices", response_model=PaginatedResponse)
async def list_invoices_admin(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    payment_status: str | None = None,
    customer_email: str | None = None,
):
    """List all invoices (admin only)"""
    conditions = [Invoice.is_deleted == False]
    if payment_status:
        conditions.append(Invoice.payment_status == payment_status)
    if customer_email:
        conditions.append(Invoice.customer_email.ilike(f"%{customer_email}%"))

    count_result = await db.execute(
        select(func.count(Invoice.id)).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    total_pages = (total + per_page - 1) // per_page if total else 0
    result = await db.execute(
        select(Invoice)
        .where(and_(*conditions))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .order_by(Invoice.created_at.desc())
    )
    invoices = result.scalars().all()

    return PaginatedResponse(
        data=[InvoiceOut.model_validate(i).model_dump() for i in invoices],
        message="Invoices fetched successfully",
        meta=PaginatedMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/admin/invoices/{invoice_id}/pdf")
async def admin_download_invoice_pdf(
    invoice_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin PDF download alias."""
    return await get_invoice_pdf(invoice_id, db, admin_id)


@router.get("/admin/bookings-v2/{booking_id}/pdf")
async def admin_booking_v2_pdf(
    booking_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download receipt PDF for a service booking (v2)."""
    booking_result = await db.execute(
        select(BookingV2).where(
            BookingV2.id == booking_id,
            BookingV2.is_deleted == False,
        )
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_booking_v2_id(booking_id)
    if not invoice:
        invoice = await invoice_service.create_booking_invoice(booking_id=booking_id)

    return await _pdf_response(invoice, db)


@router.get("/admin/bookings-v1/{booking_id}/pdf")
async def admin_booking_v1_pdf(
    booking_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download receipt PDF for a legacy booking (v1)."""
    booking_result = await db.execute(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.is_deleted == False,
        )
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_legacy_booking_id(booking_id)
    if not invoice:
        invoice = await invoice_service.create_legacy_booking_invoice(booking)

    return await _pdf_response(invoice, db)


@router.get("/admin/orders/{order_id}/pdf")
async def admin_order_pdf(
    order_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download invoice PDF for an order."""
    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_order_id(order_id)
    if not invoice:
        invoice = await invoice_service.create_order_invoice(order_id=order_id)
    return await _pdf_response(invoice, db)


@router.patch("/admin/invoices/{invoice_id}/payment-status", response_model=ApiResponse)
async def update_invoice_payment_status(
    invoice_id: uuid.UUID,
    payment_status: str = Query(...),
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update invoice payment status (admin only)"""
    result = await db.execute(
        select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.is_deleted == False)
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    old_status = invoice.payment_status
    invoice.payment_status = payment_status

    if payment_status == "paid":
        from datetime import datetime, timezone

        invoice.paid_date = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(invoice)

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="update",
        entity_type="invoice",
        entity_id=invoice.id,
        old_values={"payment_status": old_status},
        new_values={"payment_status": payment_status},
    )
    db.add(log)
    await db.commit()

    return ApiResponse(
        data=InvoiceOut.model_validate(invoice).model_dump(),
        message="Invoice payment status updated successfully",
    )


@router.delete("/admin/invoices/{invoice_id}", response_model=ApiResponse)
async def delete_invoice(
    invoice_id: uuid.UUID,
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete invoice (admin only)"""
    result = await db.execute(
        select(Invoice).where(
            and_(Invoice.id == invoice_id, Invoice.is_deleted == False)
        )
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.is_deleted = True
    await db.commit()

    log = ActivityLog(
        admin_id=uuid.UUID(admin_id),
        action="delete",
        entity_type="invoice",
        entity_id=invoice.id,
    )
    db.add(log)
    await db.commit()

    return ApiResponse(message="Invoice deleted successfully")


@router.get("/admin/diagnostics", response_model=ApiResponse)
async def invoice_diagnostics(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Pinpoint why invoice creation fails in this environment.

    Runs read-only checks plus a probe invoice INSERT inside a savepoint
    that is always rolled back, and returns the exact error text.
    """
    import secrets
    from datetime import datetime, timezone
    from sqlalchemy import text as sql_text
    from app.models.models import Order

    checks: list[dict] = []

    # 1. Table + column comparison against the ORM
    try:
        cols = (await db.execute(sql_text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'"
        ))).scalars().all()
        if not cols:
            checks.append({"check": "invoices_table", "ok": False,
                           "detail": "Table 'invoices' does not exist in this database"})
        else:
            expected = {c.name for c in Invoice.__table__.columns}
            missing = sorted(expected - set(cols))
            checks.append({"check": "invoices_table", "ok": not missing,
                           "detail": f"missing columns: {', '.join(missing)}" if missing
                           else f"all {len(expected)} ORM columns present"})
    except Exception as exc:
        checks.append({"check": "invoices_table", "ok": False, "detail": f"{type(exc).__name__}: {str(exc)[:300]}"})

    # 2. Row counts
    try:
        invoice_count = (await db.execute(select(func.count(Invoice.id)).where(Invoice.is_deleted == False))).scalar() or 0  # noqa: E712
        order_count = (await db.execute(select(func.count(Order.id)).where(Order.is_deleted == False))).scalar() or 0  # noqa: E712
        orders_without = (await db.execute(
            select(func.count(Order.id)).where(
                Order.is_deleted == False,  # noqa: E712
                Order.id.not_in(select(Invoice.order_id).where(
                    Invoice.order_id.isnot(None), Invoice.is_deleted == False)),  # noqa: E712
            )
        )).scalar() or 0
        checks.append({"check": "counts", "ok": orders_without == 0,
                       "detail": f"{invoice_count} invoices, {order_count} orders, {orders_without} orders missing an invoice"})
    except Exception as exc:
        checks.append({"check": "counts", "ok": False, "detail": f"{type(exc).__name__}: {str(exc)[:300]}"})

    # 3. Probe INSERT inside a savepoint — always rolled back
    probe = Invoice(
        invoice_number=f"DIAG-{secrets.token_hex(4).upper()}",
        customer_name="Diagnostics Probe",
        customer_phone="01700000000",
        items=[{"name": "probe item", "quantity": 1, "price": 1.0, "subtotal": 1.0}],
        subtotal=1, tax=0, total=1,
        payment_method="cod",
        payment_status="pending",
        issued_date=datetime.now(timezone.utc),
    )
    nested = await db.begin_nested()
    try:
        db.add(probe)
        await db.flush()
        checks.append({"check": "insert_probe", "ok": True, "detail": "invoice INSERT works in this database"})
    except Exception as exc:
        checks.append({"check": "insert_probe", "ok": False,
                       "detail": f"{type(exc).__name__}: {str(exc)[:500]}"})
    finally:
        try:
            await nested.rollback()
        except Exception:
            await db.rollback()
        try:
            db.expunge(probe)
        except Exception:
            pass

    all_ok = all(c["ok"] for c in checks)
    return ApiResponse(
        data={"ok": all_ok, "checks": checks},
        message="All invoice checks passed" if all_ok else "Invoice diagnostics found problems",
    )


@router.post("/admin/backfill", response_model=ApiResponse)
async def backfill_missing_invoices(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create invoices for existing orders/bookings that are missing one.

    Auto-invoice failures at checkout are swallowed (the order must still
    succeed), so this endpoint both repairs old records and surfaces the
    underlying error messages when creation keeps failing.
    """
    from app.models.models import Order

    invoice_service = InvoiceService(db)
    created = {"orders": 0, "bookings": 0, "legacy_bookings": 0}
    errors: list[str] = []

    # isnot(None) guard also avoids the SQL NOT IN + NULL trap
    order_ids_with_invoice = select(Invoice.order_id).where(
        Invoice.order_id.isnot(None), Invoice.is_deleted == False  # noqa: E712
    )
    orders_result = await db.execute(
        select(Order.id, Order.order_number).where(
            Order.is_deleted == False,  # noqa: E712
            Order.id.not_in(order_ids_with_invoice),
        )
    )
    for order_id, order_number in orders_result.all():
        try:
            await invoice_service.create_order_invoice(order_id=order_id)
            created["orders"] += 1
        except Exception as exc:
            await db.rollback()
            logger.exception("Backfill invoice failed for order %s", order_number)
            errors.append(f"Order {order_number}: {exc}")

    booking_ids_with_invoice = select(Invoice.booking_id).where(
        Invoice.booking_id.isnot(None), Invoice.is_deleted == False  # noqa: E712
    )
    bookings_result = await db.execute(
        select(BookingV2.id, BookingV2.booking_number).where(
            BookingV2.is_deleted == False,  # noqa: E712
            BookingV2.id.not_in(booking_ids_with_invoice),
        )
    )
    for booking_id, booking_number in bookings_result.all():
        try:
            await invoice_service.create_booking_invoice(booking_id=booking_id)
            created["bookings"] += 1
        except Exception as exc:
            await db.rollback()
            logger.exception("Backfill invoice failed for booking %s", booking_number)
            errors.append(f"Booking {booking_number}: {exc}")

    legacy_result = await db.execute(
        select(Booking).where(Booking.is_deleted == False)  # noqa: E712
    )
    for booking in legacy_result.scalars().all():
        try:
            if await invoice_service.get_by_legacy_booking_id(booking.id):
                continue
            await invoice_service.create_legacy_booking_invoice(booking)
            created["legacy_bookings"] += 1
        except Exception as exc:
            await db.rollback()
            logger.exception("Backfill invoice failed for legacy booking %s", booking.booking_number)
            errors.append(f"Booking {booking.booking_number}: {exc}")

    total_created = sum(created.values())
    if total_created:
        db.add(ActivityLog(
            admin_id=uuid.UUID(admin_id),
            action="create",
            entity_type="invoice",
            new_values={"backfilled": created},
        ))
        await db.commit()

    return ApiResponse(
        data={"created": created, "errors": errors[:20]},
        message=f"{total_created} invoice(s) created, {len(errors)} failed",
    )


@router.get("/admin/invoices/stats/summary", response_model=ApiResponse)
async def get_invoice_stats(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get invoice statistics"""
    from sqlalchemy import func as sql_func

    total_result = await db.execute(
        select(sql_func.count(Invoice.id)).where(Invoice.is_deleted == False)
    )
    total_invoices = total_result.scalar() or 0

    paid_result = await db.execute(
        select(sql_func.count(Invoice.id)).where(
            and_(Invoice.is_deleted == False, Invoice.payment_status == "paid")
        )
    )
    paid_invoices = paid_result.scalar() or 0

    pending_result = await db.execute(
        select(sql_func.count(Invoice.id)).where(
            and_(Invoice.is_deleted == False, Invoice.payment_status == "pending")
        )
    )
    pending_invoices = pending_result.scalar() or 0

    revenue_result = await db.execute(
        select(sql_func.sum(Invoice.total)).where(
            and_(Invoice.is_deleted == False, Invoice.payment_status == "paid")
        )
    )
    total_revenue = float(revenue_result.scalar() or 0)

    return ApiResponse(
        data={
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "pending_invoices": pending_invoices,
            "total_revenue": total_revenue,
        },
        message="Invoice stats fetched successfully",
    )
