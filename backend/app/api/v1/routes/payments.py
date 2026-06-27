import hashlib
import hmac
import logging
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.bkash import get_bkash_gateway
from app.core.config import settings
from app.core.database import get_db
from app.core.nagad import get_nagad_gateway
from app.models.models import BkashTransaction, NagadTransaction, Order
from app.schemas.schemas import (
    PaymentInitiateRequest,
    PaymentResponseModel,
    PaymentVerifyRequest,
    PaymentWebhookRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


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
        raise HTTPException(status_code=400, detail=str(e))


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

        if transaction.status == "Completed":
            order_result = await db.execute(
                select(Order).where(Order.id == transaction.order_id)
            )
            order = order_result.scalar_one_or_none()
            if order:
                order.payment_status = "completed"
                await db.commit()

        return {
            "success": transaction.status == "Completed",
            "payment_gateway": "bkash",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("bkash verify error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail=str(e))


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
        raise HTTPException(status_code=400, detail=str(e))


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

        transaction.status = "Completed"
        transaction.payment_completion_time = verify_result.get("timestamp")
        transaction.raw_response = verify_result.get("raw_data", {})
        await db.commit()

        order_result = await db.execute(
            select(Order).where(Order.id == transaction.order_id)
        )
        order = order_result.scalar_one_or_none()
        if order:
            order.payment_status = "completed"
            await db.commit()

        return {
            "success": True,
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad verify error: %s", e, exc_info=e)
        raise HTTPException(status_code=400, detail=str(e))


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
            await db.commit()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("nagad webhook error: %s", e, exc_info=e)
        return {"success": False, "error": str(e)}


@router.get("/transaction/{transaction_id}")
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
            "transaction": transaction,
            "gateway": gateway,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
