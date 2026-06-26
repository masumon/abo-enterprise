import httpx
import logging
import hashlib
import json
from datetime import datetime
from typing import Optional
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)

class NagadGateway:
    """Nagad Payment Gateway Integration"""
    
    def __init__(self):
        self.merchant_id = settings.NAGAD_MERCHANT_ID
        self.merchant_key = settings.NAGAD_MERCHANT_KEY
        self.base_url = settings.NAGAD_API_URL
        self.callback_url = settings.NAGAD_CALLBACK_URL
        self.merchant_number = settings.NAGAD_MERCHANT_NUMBER

    def _generate_signature(self, data: str) -> str:
        """Generate MD5 signature for Nagad"""
        signature = hashlib.md5((data + self.merchant_key).encode()).hexdigest()
        return signature

    async def create_payment_link(
        self,
        amount: Decimal,
        invoice_id: str,
        customer_phone: str,
        customer_name: str,
    ) -> Optional[dict]:
        """Create Nagad payment link"""
        try:
            # Prepare payment request data
            payment_data = {
                "merchantId": self.merchant_id,
                "orderId": invoice_id,
                "currencyCode": "050",  # BDT currency code
                "amount": str(int(amount * 100)),  # Amount in paisa
                "orderDateTime": datetime.now().isoformat(),
                "orderDueDateTime": datetime.now().isoformat(),
                "issuerID": "00000000000",
                "issuerRefNo": f"REF-{invoice_id}",
                "callbackURL": f"{self.callback_url}?order_id={invoice_id}",
                "additionalMerchantInfo": {
                    "name": customer_name,
                    "phone": customer_phone,
                },
            }

            # Generate signature
            data_str = json.dumps(payment_data, separators=(",", ":"))
            signature = self._generate_signature(data_str)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/dfs/payment/initiation",
                    json={
                        "payload": data_str,
                        "signature": signature,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()

                if data.get("status") == "Success":
                    return {
                        "payment_url": data.get("paymentLinkURL"),
                        "order_id": invoice_id,
                        "status": "created",
                        "session_id": data.get("sessionID"),
                    }
        except Exception as e:
            logger.error(f"Nagad payment link creation failed: {e}")
            return None

    async def verify_payment(self, session_id: str) -> Optional[dict]:
        """Verify Nagad payment"""
        try:
            payload = {
                "merchantId": self.merchant_id,
                "sessionID": session_id,
            }

            data_str = json.dumps(payload, separators=(",", ":"))
            signature = self._generate_signature(data_str)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/dfs/payment/status",
                    json={
                        "payload": data_str,
                        "signature": signature,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()

                if data.get("status") == "Success":
                    payment_info = data.get("paymentInfo", {})
                    return {
                        "transaction_id": payment_info.get("referenceID"),
                        "order_id": payment_info.get("orderId"),
                        "status": payment_info.get("status"),
                        "amount": Decimal(payment_info.get("amount", 0)) / 100,
                        "customer_number": payment_info.get("mobileNo"),
                        "timestamp": datetime.now(),
                        "raw_data": data,
                    }
        except Exception as e:
            logger.error(f"Nagad payment verification failed: {e}")
            return None

    async def refund_payment(
        self, 
        transaction_id: str, 
        amount: Decimal,
        reason: str = "Customer Request"
    ) -> Optional[dict]:
        """Refund Nagad payment"""
        try:
            payload = {
                "merchantId": self.merchant_id,
                "referenceID": transaction_id,
                "refundAmount": str(int(amount * 100)),
                "reason": reason,
            }

            data_str = json.dumps(payload, separators=(",", ":"))
            signature = self._generate_signature(data_str)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/dfs/payment/refund",
                    json={
                        "payload": data_str,
                        "signature": signature,
                    },
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()

                if data.get("status") == "Success":
                    return {
                        "refund_id": data.get("refundID"),
                        "original_transaction_id": transaction_id,
                        "refund_amount": amount,
                        "status": "refunded",
                        "timestamp": datetime.now(),
                    }
        except Exception as e:
            logger.error(f"Nagad refund failed: {e}")
            return None

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature from Nagad"""
        expected_signature = self._generate_signature(payload)
        return expected_signature == signature


_nagad_instance: "NagadGateway | None" = None

def get_nagad_gateway() -> "NagadGateway":
    global _nagad_instance
    if _nagad_instance is None:
        _nagad_instance = NagadGateway()
    return _nagad_instance
