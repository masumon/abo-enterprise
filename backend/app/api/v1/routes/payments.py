from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from decimal import Decimal
from app.core.database import get_db
from app.core.bkash import bkash_gateway
from app.core.nagad import nagad_gateway
from app.models.models import Order, BkashTransaction, NagadTransaction
from app.schemas.schemas import (
    PaymentInitiateRequest,
    PaymentVerifyRequest,
    PaymentResponseModel,
    PaymentWebhookRequest,
)
from datetime import datetime, timezone

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/bkash/initiate", response_model=PaymentResponseModel)
async def initiate_bkash_payment(
    request: PaymentInitiateRequest,
    db: Session = Depends(get_db),
):
    """Initiate bKash payment"""
    try:
        # Get order
        order = db.query(Order).filter(Order.id == request.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Create payment link
        payment_link = await bkash_gateway.create_payment_link(
            amount=Decimal(order.total),
            invoice_id=order.order_number,
            customer_phone=order.customer_phone,
            customer_name=order.customer_name,
        )

        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        # Store transaction
        transaction = BkashTransaction(
            order_id=order.id,
            bkash_transaction_id=payment_link.get("payment_id", ""),
            payment_id=payment_link.get("payment_id"),
            amount=Decimal(order.total),
            status="Initiated",
        )
        db.add(transaction)
        db.commit()

        return {
            "success": True,
            "payment_url": payment_link.get("bkash_url"),
            "payment_gateway": "bkash",
            "transaction_id": transaction.id,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bkash/verify", response_model=PaymentResponseModel)
async def verify_bkash_payment(
    request: PaymentVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify bKash payment"""
    try:
        # Get transaction
        transaction = db.query(BkashTransaction).filter(
            BkashTransaction.payment_id == request.payment_id
        ).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Verify payment
        result = await bkash_gateway.verify_payment(request.payment_id)
        if not result:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        # Update transaction
        transaction.status = "Completed" if result["status"] == "0000" else "Failed"
        transaction.bkash_transaction_id = result.get("transaction_id", "")
        transaction.payment_execute_time = result.get("timestamp")
        transaction.raw_response = result.get("raw_data", {})
        db.commit()

        if transaction.status == "Completed":
            # Update order payment status
            order = db.query(Order).filter(Order.id == transaction.order_id).first()
            if order:
                order.payment_status = "completed"
                db.commit()

        return {
            "success": transaction.status == "Completed",
            "payment_gateway": "bkash",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/nagad/initiate", response_model=PaymentResponseModel)
async def initiate_nagad_payment(
    request: PaymentInitiateRequest,
    db: Session = Depends(get_db),
):
    """Initiate Nagad payment"""
    try:
        # Get order
        order = db.query(Order).filter(Order.id == request.order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Create payment link
        payment_link = await nagad_gateway.create_payment_link(
            amount=Decimal(order.total),
            invoice_id=order.order_number,
            customer_phone=order.customer_phone,
            customer_name=order.customer_name,
        )

        if not payment_link:
            raise HTTPException(status_code=400, detail="Failed to create payment link")

        # Store transaction
        transaction = NagadTransaction(
            order_id=order.id,
            nagad_reference_id=payment_link.get("session_id", ""),
            merchant_order_id=order.order_number,
            amount=Decimal(order.total),
            merchant_number="gateway_merchant_number",
            status="Initiated",
        )
        db.add(transaction)
        db.commit()

        return {
            "success": True,
            "payment_url": payment_link.get("payment_url"),
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/nagad/verify", response_model=PaymentResponseModel)
async def verify_nagad_payment(
    request: PaymentVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify Nagad payment"""
    try:
        # Get transaction
        transaction = db.query(NagadTransaction).filter(
            NagadTransaction.nagad_reference_id == request.payment_id
        ).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Verify payment
        result = await nagad_gateway.verify_payment(request.payment_id)
        if not result:
            raise HTTPException(status_code=400, detail="Payment verification failed")

        # Update transaction
        transaction.status = "Completed"
        transaction.payment_completion_time = result.get("timestamp")
        transaction.raw_response = result.get("raw_data", {})
        db.commit()

        if transaction.status == "Completed":
            # Update order payment status
            order = db.query(Order).filter(Order.id == transaction.order_id).first()
            if order:
                order.payment_status = "completed"
                db.commit()

        return {
            "success": True,
            "payment_gateway": "nagad",
            "transaction_id": str(transaction.id),
            "status": transaction.status,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook/bkash")
async def bkash_webhook(request: PaymentWebhookRequest, db: Session = Depends(get_db)):
    """bKash payment webhook"""
    try:
        # Update transaction
        transaction = db.query(BkashTransaction).filter(
            BkashTransaction.bkash_transaction_id == request.transaction_id
        ).first()

        if transaction:
            transaction.status = request.status
            transaction.webhook_received = True
            transaction.webhook_timestamp = datetime.now(timezone.utc)
            db.commit()

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/webhook/nagad")
async def nagad_webhook(request: PaymentWebhookRequest, db: Session = Depends(get_db)):
    """Nagad payment webhook"""
    try:
        # Update transaction
        transaction = db.query(NagadTransaction).filter(
            NagadTransaction.nagad_reference_id == request.transaction_id
        ).first()

        if transaction:
            transaction.status = request.status
            transaction.webhook_received = True
            transaction.webhook_timestamp = datetime.now(timezone.utc)
            db.commit()

        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/transaction/{transaction_id}")
async def get_payment_transaction(
    transaction_id: str,
    gateway: str = Query(..., pattern="^(bkash|nagad)$"),
    db: Session = Depends(get_db),
):
    """Get payment transaction details"""
    try:
        if gateway == "bkash":
            transaction = db.query(BkashTransaction).filter(
                BkashTransaction.id == transaction_id
            ).first()
        else:
            transaction = db.query(NagadTransaction).filter(
                NagadTransaction.id == transaction_id
            ).first()

        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return {
            "success": True,
            "transaction": transaction,
            "gateway": gateway,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
