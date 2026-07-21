"""Structured logging for assistant operations."""

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AssistantActionLog

logger = logging.getLogger("abo.assistant")


class LoggingEngine:
    async def log_action(
        self,
        db: AsyncSession,
        *,
        session_id: str | None,
        intent: str,
        action: str,
        status: str,
        details: dict[str, Any] | None = None,
        admin_id: uuid.UUID | None = None,
    ) -> None:
        entry = AssistantActionLog(
            session_id=session_id,
            intent=intent,
            action=action,
            status=status,
            details=details or {},
            admin_id=admin_id,
        )
        db.add(entry)
        logger.info(
            "assistant_action session=%s intent=%s action=%s status=%s",
            session_id,
            intent,
            action,
            status,
        )

    def log_info(self, message: str, **kwargs: Any) -> None:
        logger.info(message, extra=kwargs)

    def log_warning(self, message: str, **kwargs: Any) -> None:
        logger.warning(message, extra=kwargs)

    def log_error(self, message: str, **kwargs: Any) -> None:
        logger.error(message, extra=kwargs)
