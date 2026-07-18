"""Email provider factory — instantiate correct provider based on configuration."""
import logging
from app.core.config import settings
from app.core.email_provider import EmailProvider, SMTPProvider, ResendProvider

logger = logging.getLogger(__name__)


async def get_email_provider() -> EmailProvider:
    """
    Instantiate the configured email provider.

    Priority:
    1. EMAIL_PROVIDER environment variable
    2. Falls back to SMTP (backward-compatible)

    Raises RuntimeError if provider is misconfigured.
    """
    provider_name = (settings.EMAIL_PROVIDER or "smtp").lower().strip()

    logger.debug("Initializing email provider: %s", provider_name)

    if provider_name == "resend":
        if not settings.RESEND_API_KEY:
            logger.error("Resend provider selected but RESEND_API_KEY not set")
            raise RuntimeError(
                "Resend provider requires RESEND_API_KEY environment variable"
            )
        provider = ResendProvider(
            api_key=settings.RESEND_API_KEY,
            from_email=settings.SMTP_FROM or settings.BUSINESS_EMAIL,
            from_name=settings.EMAIL_SENDER_NAME,
        )
        if not provider.validate():
            raise RuntimeError("Resend provider validation failed")
        logger.info("Using Resend email provider")
        return provider

    elif provider_name == "smtp" or not provider_name:
        # Load config from database (admin overrides) or environment
        from app.core.email_config import env_email_config, resolve_email_config
        from app.core.database import AsyncSessionLocal

        try:
            async with AsyncSessionLocal() as db:
                cfg = await resolve_email_config(db)
        except Exception:
            logger.warning("Could not load SMTP config from DB, using env only")
            cfg = env_email_config()

        provider = SMTPProvider(cfg)
        if not provider.validate():
            logger.warning("SMTP provider not configured")
            # Don't raise — allow graceful degradation (log warning in email.py)
        logger.info("Using SMTP email provider")
        return provider

    else:
        logger.error("Unknown email provider: %s", provider_name)
        raise RuntimeError(f"Unknown email provider: {provider_name}")
