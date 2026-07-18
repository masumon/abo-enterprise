"""Email provider abstraction — supports multiple backends (SMTP, Resend, SendGrid, etc.)"""
from abc import ABC, abstractmethod
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Try importing Resend at module load time
try:
    from resend import Resend as ResendClient
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    ResendClient = None


class EmailProvider(ABC):
    """Base interface for email providers."""

    @abstractmethod
    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        attachments: Optional[list] = None,
    ) -> None:
        """Send email. Raises on failure (caller handles retry)."""
        pass

    @abstractmethod
    def validate(self) -> bool:
        """Validate provider configuration. Return True if ready."""
        pass


class SMTPProvider(EmailProvider):
    """SMTP provider — existing implementation."""

    def __init__(self, cfg: dict):
        self.cfg = cfg

    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        attachments: Optional[list] = None,
    ) -> None:
        """Delegate to existing SMTP implementation."""
        from app.core.email import _send_sync
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, _send_sync, self.cfg, to, subject, html, attachments
        )

    def validate(self) -> bool:
        return bool(self.cfg.get("host") and self.cfg.get("user") and self.cfg.get("password"))


class ResendProvider(EmailProvider):
    """Resend API provider — modern, reliable."""

    def __init__(self, api_key: str, from_email: str, from_name: str):
        if not RESEND_AVAILABLE:
            logger.error("Resend package not available. Install with: pip install resend")
            raise RuntimeError("Resend provider requires: pip install resend")

        self.api_key = api_key
        self.from_email = from_email
        self.from_name = from_name

    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        attachments: Optional[list] = None,
    ) -> None:
        """Send via Resend API."""
        if not RESEND_AVAILABLE or ResendClient is None:
            raise RuntimeError("Resend provider not available")

        client = ResendClient(api_key=self.api_key)

        # Resend doesn't support attachments in the same way as SMTP
        # For now, we log a warning if attachments are provided
        if attachments:
            logger.warning(
                "Resend provider: attachments not yet supported, skipping %d files",
                len(attachments),
            )

        response = client.emails.send(
            {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": to,
                "subject": subject,
                "html": html,
            }
        )

        # Resend returns response with 'id' on success, error info on failure
        if not response.get("id"):
            error_msg = response.get("message", "Unknown error")
            raise RuntimeError(f"Resend API error: {error_msg}")

        logger.info("Email sent via Resend to %s (id=%s)", to, response.get("id"))

    def validate(self) -> bool:
        return bool(self.api_key and self.from_email)
