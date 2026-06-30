"""Optional SMS delivery for OTP — GreenWeb / generic HTTP SMS API."""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_sms(phone: str, message: str) -> bool:
    """Send SMS if SMS_API_URL and SMS_API_KEY are configured."""
    if not settings.SMS_API_URL or not settings.SMS_API_KEY:
        return False

    # Normalize to 880 format for BD gateways
    to_number = phone if phone.startswith("880") else f"88{phone}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # GreenWeb-compatible GET endpoint
            response = await client.get(
                settings.SMS_API_URL,
                params={
                    "token": settings.SMS_API_KEY,
                    "to": to_number,
                    "message": message,
                },
            )
            response.raise_for_status()
            body = response.text.strip().lower()
            if "success" in body or body.startswith("ok") or body == "200":
                return True
            logger.warning("SMS API response: %s", response.text[:200])
            return False
    except Exception as exc:
        logger.error("SMS send failed: %s", exc)
        return False
