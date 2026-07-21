"""Final assistant response validation and sanitation."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ResponseValidatorConfig:
    max_length: int = 4000


@dataclass(slots=True)
class ResponseValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)


class ResponseValidator:
    def __init__(self, config: ResponseValidatorConfig | None = None) -> None:
        self.config = config or ResponseValidatorConfig()

    def validate(self, message: str) -> ResponseValidationResult:
        try:
            errors: list[str] = []
            if not message or not message.strip():
                errors.append("empty_message")
            if len(message) > self.config.max_length:
                errors.append("message_too_long")
            return ResponseValidationResult(valid=not errors, errors=errors)
        except Exception as exc:
            logger.warning("response_validation_failed: %s", exc)
            return ResponseValidationResult(valid=False, errors=["validation_error"])
