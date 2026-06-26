"""Custom exceptions for ABO Enterprise"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class ABOException(Exception):
    """Base exception for ABO Enterprise"""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "INTERNAL_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(ABOException):
    """Validation error (400)"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundError(ABOException):
    """Resource not found (404)"""

    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedError(ABOException):
    """Unauthorized access (401)"""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenError(ABOException):
    """Forbidden access (403)"""

    def __init__(self, message: str = "Access forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class ConflictError(ABOException):
    """Conflict error (409)"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            details=details,
        )


class DuplicateError(ConflictError):
    """Duplicate resource error"""

    def __init__(self, resource: str, field: str, value: str):
        message = f"{resource} with {field} '{value}' already exists"
        super().__init__(
            message=message,
            details={"field": field, "value": value},
        )


class InvalidStateError(ABOException):
    """Invalid state transition error (422)"""

    def __init__(self, current_state: str, target_state: str):
        message = f"Cannot transition from '{current_state}' to '{target_state}'"
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="INVALID_STATE",
        )


class InsufficientFundsError(ABOException):
    """Insufficient funds error"""

    def __init__(self, required: float, available: float):
        message = f"Insufficient funds. Required: {required}, Available: {available}"
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="INSUFFICIENT_FUNDS",
            details={"required": required, "available": available},
        )


class RateLimitError(ABOException):
    """Rate limit exceeded error (429)"""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after},
        )


class ExternalServiceError(ABOException):
    """External service error (503)"""

    def __init__(self, service_name: str, message: str = "Service unavailable"):
        full_message = f"{service_name}: {message}"
        super().__init__(
            message=full_message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service_name},
        )


class PaymentError(ABOException):
    """Payment processing error"""

    def __init__(self, message: str, error_code: str = "PAYMENT_ERROR"):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=error_code,
        )


class DatabaseError(ABOException):
    """Database error (500)"""

    def __init__(self, message: str = "Database error"):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
        )


def to_http_exception(exc: ABOException) -> HTTPException:
    """Convert ABOException to HTTPException"""
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "message": exc.message,
            "error_code": exc.error_code,
            "details": exc.details if exc.details else None,
        },
    )
