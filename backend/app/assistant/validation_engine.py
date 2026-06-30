"""Request and payload validation for assistant messages."""

import re
from dataclasses import dataclass

from app.schemas.schemas import bd_phone


_PHONE_RE = re.compile(r"^0[13-9]\d{9}$")


@dataclass
class ValidationResult:
    valid: bool
    errors: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.errors is None:
            self.errors = []


class ValidationEngine:
    MAX_MESSAGE_LEN = 2000
    MIN_MESSAGE_LEN = 1

    def validate_message(self, message: str) -> ValidationResult:
        errors: list[str] = []
        if not message or not message.strip():
            errors.append("Message cannot be empty")
        elif len(message) > self.MAX_MESSAGE_LEN:
            errors.append(f"Message exceeds {self.MAX_MESSAGE_LEN} characters")
        return ValidationResult(valid=len(errors) == 0, errors=errors)

    def validate_phone(self, phone: str | None) -> ValidationResult:
        if not phone:
            return ValidationResult(valid=False, errors=["Phone number is required"])
        try:
            bd_phone(phone.strip())
            return ValidationResult(valid=True)
        except ValueError as e:
            return ValidationResult(valid=False, errors=[str(e)])

    def validate_session_id(self, session_id: str | None) -> ValidationResult:
        if not session_id:
            return ValidationResult(valid=True)
        if len(session_id) > 64 or not re.match(r"^[a-zA-Z0-9_-]+$", session_id):
            return ValidationResult(valid=False, errors=["Invalid session ID"])
        return ValidationResult(valid=True)

    def validate_customer_name(self, name: str | None) -> ValidationResult:
        if not name or len(name.strip()) < 2:
            return ValidationResult(valid=False, errors=["Customer name is required (min 2 characters)"])
        if len(name) > 100:
            return ValidationResult(valid=False, errors=["Customer name too long"])
        return ValidationResult(valid=True)
