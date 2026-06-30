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


# ==================== PUBLIC CUSTOMER PDF ====================

@router.get("/public/order/{order_number}/pdf")
async def public_order_invoice_pdf(
    order_number: str,
    phone: str = Query(..., min_length=11, max_length=11),
    db: AsyncSession = Depends(get_db),
):
    """Download order invoice PDF — requires matching customer phone."""
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

    invoice_service = InvoiceService(db)
    invoice = await invoice_service.get_by_order_id(order.id)
    if not invoice:
        invoice = await invoice_service.create_order_invoice(order_id=order.id)
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

        invoice.paid_date = datetime.now(timezone.utc).date()

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
