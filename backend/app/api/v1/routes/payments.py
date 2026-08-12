import hashlib
import hmac
import logging
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.bkash import get_bkash_gateway
from app.core.config import settings
from app.core.database import get_db
from app.core.nagad import get_nagad_gateway
from app.core.rate_limit import rate_limit
from app.core.sslcommerz import get_sslcommerz_gateway
from app.core.site_url import resolve_site_url
from app.core.invoice import InvoiceService
from app.models.models import BkashTransaction, BookingV2, NagadTransaction, Order, SslcommerzTransaction
from app.schemas.schemas import (
    BookingPaymentInitiateRequest,
    PaymentInitiateRequest,
    PaymentResponseModel,
    PaymentVerifyRequest,
    PaymentWebhookRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


async def _notify_payment_failed(db: AsyncSession, *, gateway: str, reference: str, amount) -> None:
    from app.core.notifications import create_notification
    await create_notification(
        db, commit=False,
        type="payment_failed",
        severity="error",
        title=f"{gateway.title()} payment failed",
        body=f"Reference {reference} — amount {amount}",
        link="/sumon/payments",
        meta={"gateway": gateway, "reference": reference},
    )


async def _upsert_sslcommerz_transaction(
    db: AsyncSession,
    *,
    tran_id: str,
    amount: Decimal,
    order_id=None,
    booking_id=None,
) -> None:
    """Record a fresh payment session, reusing the row on a customer retry
    (SSLCommerz reuses the same tran_id — order_number/booking_number — on
    every initiate call, so a second attempt after a failed/abandoned first
    one must update rather than violate the tran_id unique constraint)."""
    existing = (await db.execute(
        select(SslcommerzTransaction).where(SslcommerzTransaction.tran_id == tran_id)
    )).scalar_one_or_none()
    if existing:
        existing.amount = amount
        existing.status = "Initiated"
        existing.webhook_received = False
    else:
        db.add(SslcommerzTransaction(
            order_id=order_id,
            booking_id=booking_id,
            tran_id=tran_id,
            amount=amount,
            status="Initiated",
        ))
    await db.commit()


async def _mark_booking_paid(db: AsyncSession, booking_id) -> BookingV2 | None:
    """Shared success handler for a completed booking payment, regardless of
    gateway — mirrors the order-side InvoiceService.mark_order_invoice_paid."""
    result = await db.execute(select(BookingV2).where(BookingV2.id == booking_id))
    booking = result.scalar_one_or_none()
    if booking and booking.payment_status not in ("paid", "completed"):
        if booking.advance_amount and not booking.advance_paid:
            booking.advance_paid = True
        else:
            booking.payment_status = "paid"
        if booking.status == "pending":
            booking.status = "confirmed"
        await db.commit()
    return booking


def _verify_bkash_webhook(body: bytes, signature: str) -> bool:
    """HMAC-SHA256 verification using BKASH_APP_SECRET as key."""
    if not settings.BKASH_APP_SECRET:
        return False
    expected = hmac.new(
        settings.BKASH_APP_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/bkash/initiate", response_model=PaymentResponseModel)
async def initiate_bkash_payment(
    request: PaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(Order).where(Order.id == request.order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        payment_link = await get_bkash_gateway().create_payment_link(
            amount=Decimal(order.total),
            invoice_id=order.order_number,
            customer_phone=order.customer_phone,
            customer_name=order.customer_name,
        )

        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        transaction = BkashTransaction(
            order_id=order.id,
            bkash_transaction_id=payment_link.get("payment_id", ""),
            payment_id=payment_link.get("payment_id"),
            amount=Decimal(order.total),
            status="Initiated",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return {
            "success": True,
            "payment_url": payment_link.get("bkash_url"),
            "payment_gateway": "bkash",
            "transaction_id": str(transaction.id),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bkash initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")


@router.post("/bkash/verify", response_model=PaymentResponseModel)
async def verify_bkash_payment(
    request: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(BkashTransaction).where(BkashTransaction.payment_id == request.payment_id)
        )
        transaction = result.scalar_one_or_none()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        verify_result = await get_bkash_gateway().verify_payment(request.payment_id)
        if not verify_result:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        transaction.status = "Completed" if verify_result["status"] == "0000" else "Failed"
        transaction.bkash_transaction_id = verify_result.get("transaction_id", "")
        transaction.payment_execute_time = verify_result.get("timestamp")
        transaction.raw_response = verify_result.get("raw_data", {})
        await db.commit()

        order = None
        booking = None
        if transaction.order_id:
            order_result = await db.execute(select(Order).where(Order.id == transaction.order_id))
            order = order_result.scalar_one_or_none()
            if transaction.status == "Completed" and order:
                order.payment_status = "completed"
                if order.order_status == "pending":
                    order.order_status = "confirmed"
                await InvoiceService(db).mark_order_invoice_paid(order.id)
                await db.commit()
        elif transaction.booking_id:
            if transaction.status == "Completed":
                booking = await _mark_booking_paid(db, transaction.booking_id)
            else:
                booking_result = await db.execute(select(BookingV2).where(BookingV2.id == transaction.booking_id))
                booking = booking_result.scalar_one_or_none()

        return {
            "success": transaction.status == "Completed",
            "payment_gateway": "bkash",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
            "order_number": order.order_number if order else None,
            "booking_number": booking.booking_number if booking else None,
            "customer_phone": (order or booking).customer_phone if (order or booking) else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bkash verify error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment verification failed")


@router.post("/bkash/initiate-booking", response_model=PaymentResponseModel)
async def initiate_bkash_booking_payment(
    request: BookingPaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    """bKash checkout for a service booking — mirrors initiate_sslcommerz_booking_payment.

    Amount is server-derived the same way: outstanding advance if one is due,
    otherwise the settled/quoted price. Never taken from the client.
    """
    from app.api.v1.routes.bookings_v2 import _phone_matches

    booking = (await db.execute(
        select(BookingV2).where(
            BookingV2.id == request.booking_id,
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not booking or not _phone_matches(booking.customer_phone, request.phone):
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.payment_status in ("paid", "completed"):
        raise HTTPException(status_code=409, detail="This booking is already paid")

    advance_due = float(booking.advance_amount or 0) if not booking.advance_paid else 0.0
    amount = advance_due or float(booking.final_price or booking.quoted_price or 0)
    if amount <= 0:
        raise HTTPException(
            status_code=409,
            detail="This booking has no amount to pay yet. We'll confirm the price with you first.",
        )

    try:
        payment_link = await get_bkash_gateway().create_payment_link(
            amount=Decimal(str(amount)),
            invoice_id=booking.booking_number,
            customer_phone=booking.customer_phone,
            customer_name=booking.customer_name,
        )
        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        transaction = BkashTransaction(
            booking_id=booking.id,
            bkash_transaction_id=payment_link.get("payment_id", ""),
            payment_id=payment_link.get("payment_id"),
            amount=Decimal(str(amount)),
            status="Initiated",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return {
            "success": True,
            "payment_url": payment_link.get("bkash_url"),
            "payment_gateway": "bkash",
            "transaction_id": str(transaction.id),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bkash booking initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")


@router.post("/nagad/initiate-booking", response_model=PaymentResponseModel)
async def initiate_nagad_booking_payment(
    request: BookingPaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Nagad checkout for a service booking — mirrors initiate_sslcommerz_booking_payment."""
    from app.api.v1.routes.bookings_v2 import _phone_matches

    booking = (await db.execute(
        select(BookingV2).where(
            BookingV2.id == request.booking_id,
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not booking or not _phone_matches(booking.customer_phone, request.phone):
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.payment_status in ("paid", "completed"):
        raise HTTPException(status_code=409, detail="This booking is already paid")

    advance_due = float(booking.advance_amount or 0) if not booking.advance_paid else 0.0
    amount = advance_due or float(booking.final_price or booking.quoted_price or 0)
    if amount <= 0:
        raise HTTPException(
            status_code=409,
            detail="This booking has no amount to pay yet. We'll confirm the price with you first.",
        )

    try:
        payment_link = await get_nagad_gateway().create_payment_link(
            amount=Decimal(str(amount)),
            invoice_id=booking.booking_number,
            customer_phone=booking.customer_phone,
            customer_name=booking.customer_name,
        )
        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        transaction = NagadTransaction(
            booking_id=booking.id,
            nagad_reference_id=payment_link.get("session_id", ""),
            merchant_order_id=booking.booking_number,
            amount=Decimal(str(amount)),
            merchant_number=settings.NAGAD_MERCHANT_NUMBER,
            status="Initiated",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return {
            "success": True,
            "payment_url": payment_link.get("payment_url"),
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad booking initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")


@router.post("/nagad/initiate", response_model=PaymentResponseModel)
async def initiate_nagad_payment(
    request: PaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(Order).where(Order.id == request.order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        payment_link = await get_nagad_gateway().create_payment_link(
            amount=Decimal(order.total),
            invoice_id=order.order_number,
            customer_phone=order.customer_phone,
            customer_name=order.customer_name,
        )

        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        transaction = NagadTransaction(
            order_id=order.id,
            nagad_reference_id=payment_link.get("session_id", ""),
            merchant_order_id=order.order_number,
            amount=Decimal(order.total),
            merchant_number=settings.NAGAD_MERCHANT_NUMBER,
            status="Initiated",
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        return {
            "success": True,
            "payment_url": payment_link.get("payment_url"),
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")


@router.post("/nagad/verify", response_model=PaymentResponseModel)
async def verify_nagad_payment(
    request: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(
            select(NagadTransaction).where(
                NagadTransaction.nagad_reference_id == request.payment_id
            )
        )
        transaction = result.scalar_one_or_none()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        verify_result = await get_nagad_gateway().verify_payment(request.payment_id)
        if not verify_result:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        payment_status = str(verify_result.get("status", "")).lower()
        is_completed = payment_status in ("success", "completed", "0000", "approved")
        transaction.status = "Completed" if is_completed else "Failed"
        transaction.payment_completion_time = verify_result.get("timestamp")
        transaction.raw_response = verify_result.get("raw_data", {})
        await db.commit()

        order = None
        booking = None
        if transaction.order_id:
            order_result = await db.execute(select(Order).where(Order.id == transaction.order_id))
            order = order_result.scalar_one_or_none()
            if is_completed and order:
                order.payment_status = "completed"
                if order.order_status == "pending":
                    order.order_status = "confirmed"
                await InvoiceService(db).mark_order_invoice_paid(order.id)
                await db.commit()
        elif transaction.booking_id:
            if is_completed:
                booking = await _mark_booking_paid(db, transaction.booking_id)
            else:
                booking_result = await db.execute(select(BookingV2).where(BookingV2.id == transaction.booking_id))
                booking = booking_result.scalar_one_or_none()

        return {
            "success": is_completed,
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
            "order_number": order.order_number if order else None,
            "booking_number": booking.booking_number if booking else None,
            "customer_phone": (order or booking).customer_phone if (order or booking) else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad verify error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment verification failed")


@router.post("/sslcommerz/initiate", response_model=PaymentResponseModel)
async def initiate_sslcommerz_payment(
    request: PaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(Order).where(Order.id == request.order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        base = await resolve_site_url(db)
        phone_q = quote(order.customer_phone, safe="")
        success_url = request.success_url or f"{base}/payment/callback?status=success&order={order.order_number}&phone={phone_q}"
        fail_url = request.fail_url or f"{base}/payment/callback?status=failed&order={order.order_number}&phone={phone_q}"
        cancel_url = request.cancel_url or f"{base}/payment/callback?status=cancelled&order={order.order_number}&phone={phone_q}"

        session = await get_sslcommerz_gateway().create_session(
            amount=Decimal(order.total),
            order_number=order.order_number,
            customer_name=order.customer_name,
            customer_phone=order.customer_phone,
            customer_email=order.customer_email,
            success_url=success_url,
            fail_url=fail_url,
            cancel_url=cancel_url,
        )

        if not session:
            raise HTTPException(status_code=400, detail="SSLCommerz not configured or session failed")

        await _upsert_sslcommerz_transaction(
            db, tran_id=order.order_number, amount=Decimal(order.total), order_id=order.id,
        )

        return {
            "success": True,
            "payment_url": session.get("payment_url"),
            "payment_gateway": "sslcommerz",
            "transaction_id": session.get("session_key"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sslcommerz initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")


@router.post("/sslcommerz/initiate-booking", response_model=PaymentResponseModel)
async def initiate_sslcommerz_booking_payment(
    request: BookingPaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Hosted checkout for a service booking — the customer-facing pay path.

    Amount is server-derived: the outstanding advance/consultancy fee when one
    is due, otherwise the settled or quoted price. Never taken from the client.

    Like the order flow, the redirect back is presentational only — a booking
    is marked paid by an admin (or by a verified gateway callback), never by a
    query parameter, which anyone could forge.
    """
    from app.api.v1.routes.bookings_v2 import _phone_matches

    booking = (await db.execute(
        select(BookingV2).where(
            BookingV2.id == request.booking_id,
            BookingV2.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not booking or not _phone_matches(booking.customer_phone, request.phone):
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.payment_status in ("paid", "completed"):
        raise HTTPException(status_code=409, detail="This booking is already paid")

    advance_due = float(booking.advance_amount or 0) if not booking.advance_paid else 0.0
    amount = advance_due or float(booking.final_price or booking.quoted_price or 0)
    if amount <= 0:
        raise HTTPException(
            status_code=409,
            detail="This booking has no amount to pay yet. We'll confirm the price with you first.",
        )

    base = await resolve_site_url(db)
    phone_q = quote(booking.customer_phone, safe="")
    ref = f"{base}/booking-success?booking={booking.id}&phone={phone_q}"
    success_url = request.success_url or f"{ref}&payment=success"
    fail_url = request.fail_url or f"{ref}&payment=failed"
    cancel_url = request.cancel_url or f"{ref}&payment=cancelled"

    try:
        session = await get_sslcommerz_gateway().create_session(
            amount=Decimal(str(amount)),
            order_number=booking.booking_number,
            customer_name=booking.customer_name,
            customer_phone=booking.customer_phone,
            customer_email=booking.customer_email,
            success_url=success_url,
            fail_url=fail_url,
            cancel_url=cancel_url,
        )
    except Exception as e:
        logger.error("sslcommerz booking initiate error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Payment initiation failed")

    if not session:
        raise HTTPException(status_code=400, detail="SSLCommerz not configured or session failed")

    await _upsert_sslcommerz_transaction(
        db, tran_id=booking.booking_number, amount=Decimal(str(amount)), booking_id=booking.id,
    )

    return {
        "success": True,
        "payment_url": session.get("payment_url"),
        "payment_gateway": "sslcommerz",
        "transaction_id": session.get("session_key"),
    }


@router.post("/webhook/bkash")
async def bkash_webhook(
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await http_request.body()
    signature = http_request.headers.get("X-Bkash-Signature", "")
    if not _verify_bkash_webhook(body, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = PaymentWebhookRequest.model_validate_json(body)
        result = await db.execute(
            select(BkashTransaction).where(
                BkashTransaction.bkash_transaction_id == payload.transaction_id
            )
        )
        transaction = result.scalar_one_or_none()

        if transaction:
            transaction.status = payload.status
            transaction.webhook_received = True
            transaction.webhook_timestamp = datetime.now(timezone.utc)
            if payload.status.lower() == "failed":
                await _notify_payment_failed(db, gateway="bkash", reference=payload.transaction_id, amount=transaction.amount)
            await db.commit()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bkash webhook error: %s", e, exc_info=e)
        return {"success": False, "error": str(e)}


@router.post("/webhook/nagad")
async def nagad_webhook(
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await http_request.body()
    signature = http_request.headers.get("X-Nagad-Signature", "")
    if not get_nagad_gateway().verify_webhook_signature(body.decode(), signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = PaymentWebhookRequest.model_validate_json(body)
        result = await db.execute(
            select(NagadTransaction).where(
                NagadTransaction.nagad_reference_id == payload.transaction_id
            )
        )
        transaction = result.scalar_one_or_none()

        if transaction:
            transaction.status = payload.status
            transaction.webhook_received = True
            transaction.webhook_timestamp = datetime.now(timezone.utc)
            if payload.status.lower() == "failed":
                await _notify_payment_failed(db, gateway="nagad", reference=payload.transaction_id, amount=transaction.amount)
            await db.commit()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad webhook error: %s", e, exc_info=e)
        return {"success": False, "error": str(e)}


@router.post("/webhook/sslcommerz")
async def sslcommerz_webhook(
    http_request: Request,
    db: AsyncSession = Depends(get_db),
):
    """SSLCommerz IPN. Sent server-to-server as application/x-www-form-urlencoded;
    validated via the store-password-signed hash (verify_key/verify_sign), the
    same trust model already used for the bKash/Nagad webhooks above."""
    form = await http_request.form()
    post_data = {k: str(v) for k, v in form.items()}

    if not get_sslcommerz_gateway().verify_ipn(post_data):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid IPN signature")

    try:
        tran_id = post_data.get("tran_id", "")
        gateway_status = post_data.get("status", "").upper()
        is_valid = gateway_status in ("VALID", "VALIDATED")

        result = await db.execute(
            select(SslcommerzTransaction).where(SslcommerzTransaction.tran_id == tran_id)
        )
        transaction = result.scalar_one_or_none()
        if not transaction:
            logger.warning("sslcommerz webhook: unknown tran_id %s", tran_id)
            return {"success": False, "error": "transaction not found"}

        transaction.status = "Completed" if is_valid else "Failed"
        transaction.val_id = post_data.get("val_id") or transaction.val_id
        transaction.bank_tran_id = post_data.get("bank_tran_id") or transaction.bank_tran_id
        transaction.card_type = post_data.get("card_type") or transaction.card_type
        transaction.webhook_received = True
        transaction.webhook_timestamp = datetime.now(timezone.utc)
        transaction.raw_response = post_data
        if not is_valid:
            await _notify_payment_failed(db, gateway="sslcommerz", reference=tran_id, amount=transaction.amount)
        await db.commit()

        if is_valid and transaction.order_id:
            order_result = await db.execute(select(Order).where(Order.id == transaction.order_id))
            order = order_result.scalar_one_or_none()
            if order and order.payment_status != "completed":
                order.payment_status = "completed"
                if order.order_status == "pending":
                    order.order_status = "confirmed"
                await InvoiceService(db).mark_order_invoice_paid(order.id)
                await db.commit()
        elif is_valid and transaction.booking_id:
            await _mark_booking_paid(db, transaction.booking_id)

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("sslcommerz webhook error: %s", e, exc_info=e)
        return {"success": False, "error": str(e)}


@router.get(
    "/transaction/{transaction_id}",
    dependencies=[Depends(rate_limit("payment_tx_lookup", 30, 300))],
)
async def get_payment_transaction(
    transaction_id: str,
    gateway: str = Query(..., pattern="^(bkash|nagad)$"),
    db: AsyncSession = Depends(get_db),
):
    try:
        if gateway == "bkash":
            result = await db.execute(
                select(BkashTransaction).where(BkashTransaction.id == transaction_id)
            )
        else:
            result = await db.execute(
                select(NagadTransaction).where(NagadTransaction.id == transaction_id)
            )

        transaction = result.scalar_one_or_none()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return {
            "success": True,
            "transaction": {
                "id": str(transaction.id),
                "order_id": str(transaction.order_id) if transaction.order_id else None,
                "status": transaction.status,
                "amount": float(transaction.amount),
                "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
            },
            "gateway": gateway,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("transaction lookup error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail="Could not load transaction")
