import pytest
from fastapi import HTTPException
from uuid import uuid4

from app.api.v1.routes.bookings import update_booking_status


@pytest.mark.asyncio
async def test_legacy_booking_status_update_is_rejected_without_database_mutation():
    with pytest.raises(HTTPException) as exc:
        await update_booking_status(uuid4(), None, None, "admin")

    assert exc.value.status_code == 409
    assert "read-only" in str(exc.value.detail).lower()
