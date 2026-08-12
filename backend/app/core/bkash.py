import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)

class BkashGateway:
    """bKash Payment Gateway Integration"""
    
    def __init__(self):
        self.app_key = settings.BKASH_APP_KEY
        self.app_secret = settings.BKASH_APP_SECRET
        self.username = settings.BKASH_USERNAME
        self.password = settings.BKASH_PASSWORD
        self.base_url = settings.BKASH_API_URL
        self.callback_url = settings.BKASH_CALLBACK_URL
        self.token = None
        self.token_expires_at = None

    async def authenticate(self) -> bool:
        """Authenticate and get access token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/tokenized/checkout/token/request",
                    json={
                        "app_key": self.app_key,
                        "app_secret": self.app_secret,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                self.token = data.get("id_token")
                # bKash tokens are valid for expires_in seconds (1 hour per
                # their docs); refresh 60s early so a call never starts on a
                # token that expires mid-request.
                try:
                    expires_in = int(data.get("expires_in") or 3600)
                except (TypeError, ValueError):
                    expires_in = 3600
                self.token_expires_at = datetime.now() + timedelta(seconds=max(expires_in - 60, 60))
                logger.info("bKash authentication successful")
                return True
        except Exception as e:
            logger.error(f"bKash authentication failed: {e}")
            self.token = None
            self.token_expires_at = None
            return False

    def _token_valid(self) -> bool:
        return bool(self.token) and self.token_expires_at is not None and datetime.now() < self.token_expires_at

    async def create_payment_link(
        self,
        amount: Decimal,
        invoice_id: str,
        customer_phone: str,
        customer_name: str,
    ) -> Optional[dict]:
        """Create bKash payment link"""
        if not self._token_valid():
            await self.authenticate()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/tokenized/checkout/create",
                    json={
                        "mode": "0011",
                        "amount": str(amount),
                        "currency": "BDT",
                        "intent": "sale",
                        "merchantInvoiceNumber": invoice_id,
                        "callbackURL": f"{self.callback_url}?invoice_id={invoice_id}",
                        "reference": f"Order-{invoice_id}",
                    },
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "X-APP-Key": self.app_key,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "bkash_url": data.get("bkashURL"),
                    "payment_id": data.get("paymentID"),
                    "status": data.get("statusCode"),
                }
        except Exception as e:
            logger.error(f"bKash payment link creation failed: {e}")
            return None

    async def verify_payment(self, payment_id: str) -> Optional[dict]:
        """Verify bKash payment"""
        if not self._token_valid():
            await self.authenticate()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/tokenized/checkout/execute",
                    json={
                        "paymentID": payment_id,
                    },
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "X-APP-Key": self.app_key,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "transaction_id": data.get("trxID"),
                    "status": data.get("statusCode"),
                    "amount": data.get("amount"),
                    "payer_reference": data.get("payerReference"),
                    "timestamp": datetime.now(),
                    "raw_data": data,
                }
        except Exception as e:
            logger.error(f"bKash payment verification failed: {e}")
            return None

    async def refund_payment(self, transaction_id: str, amount: Decimal) -> Optional[dict]:
        """Refund bKash payment"""
        if not self._token_valid():
            await self.authenticate()

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/tokenized/checkout/refund",
                    json={
                        "trxID": transaction_id,
                        "amount": str(amount),
                        "reason": "Customer Refund Request",
                    },
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "X-APP-Key": self.app_key,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()
                
                return {
                    "refund_transaction_id": data.get("refundTrxID"),
                    "status": data.get("statusCode"),
                    "timestamp": datetime.now(),
                }
        except Exception as e:
            logger.error(f"bKash refund failed: {e}")
            return None


_bkash_instance: "BkashGateway | None" = None

def get_bkash_gateway() -> "BkashGateway":
    global _bkash_instance
    if _bkash_instance is None:
        _bkash_instance = BkashGateway()
    return _bkash_instance
