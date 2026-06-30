import hashlib
import logging
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SANDBOX_URL = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
LIVE_URL = "https://securepay.sslcommerz.com/gwprocess/v4/api.php"


class SSLCommerzGateway:
    """SSLCommerz payment gateway — optional, env-configured."""

    def __init__(self) -> None:
        self.store_id = settings.SSLCOMMERZ_STORE_ID
        self.store_password = settings.SSLCOMMERZ_STORE_PASSWORD
        self.is_sandbox = settings.SSLCOMMERZ_IS_SANDBOX
        self.base_url = SANDBOX_URL if self.is_sandbox else LIVE_URL

    @property
    def configured(self) -> bool:
        return bool(self.store_id and self.store_password)

    async def create_session(
        self,
        *,
        amount: Decimal,
        order_number: str,
        customer_name: str,
        customer_phone: str,
        customer_email: str | None,
        success_url: str,
        fail_url: str,
        cancel_url: str,
    ) -> Optional[dict]:
        if not self.configured:
            logger.warning("SSLCommerz not configured — set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD")
            return None

        payload = {
            "store_id": self.store_id,
            "store_passwd": self.store_password,
            "total_amount": str(amount),
            "currency": "BDT",
            "tran_id": order_number,
            "success_url": success_url,
            "fail_url": fail_url,
            "cancel_url": cancel_url,
            "cus_name": customer_name[:50],
            "cus_phone": customer_phone,
            "cus_email": customer_email or "customer@aboenterprise.com",
            "cus_add1": "Bangladesh",
            "cus_city": "Sylhet",
            "cus_country": "Bangladesh",
            "shipping_method": "NO",
            "product_name": f"Order {order_number}",
            "product_category": "General",
            "product_profile": "general",
        }

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(self.base_url, data=payload)
                response.raise_for_status()
                data = response.json()
                if data.get("status") == "SUCCESS" and data.get("GatewayPageURL"):
                    return {
                        "payment_url": data["GatewayPageURL"],
                        "session_key": data.get("sessionkey", ""),
                        "tran_id": order_number,
                    }
                logger.error("SSLCommerz session failed: %s", data)
                return None
        except Exception as exc:
            logger.error("SSLCommerz create_session error: %s", exc, exc_info=exc)
            return None

    def verify_ipn(self, post_data: dict) -> bool:
        """Verify SSLCommerz IPN hash (val_id validation is done via API in production)."""
        if not self.configured:
            return False
        verify_key = post_data.get("verify_key", "")
        verify_sign = post_data.get("verify_sign", "")
        if not verify_key or not verify_sign:
            return False
        keys = verify_key.split(",")
        data = {k: post_data[k] for k in keys if k in post_data}
        data["store_passwd"] = self.store_password
        sorted_pairs = sorted(data.items())
        sign_str = urlencode(sorted_pairs)
        expected = hashlib.md5(sign_str.encode()).hexdigest()
        return expected == verify_sign


_gateway: SSLCommerzGateway | None = None


def get_sslcommerz_gateway() -> SSLCommerzGateway:
    global _gateway
    if _gateway is None:
        _gateway = SSLCommerzGateway()
    return _gateway
