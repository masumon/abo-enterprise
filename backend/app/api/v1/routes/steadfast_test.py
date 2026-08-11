from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.steadfast_test_connection import test_connection
from app.core.database import get_db
from app.core.security import require_role

router = APIRouter(prefix="/admin/steadfast", tags=["admin-steadfast"])


@router.get("/test-connection")
async def test_steadfast_connection(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("settings.read")),
):
    """Safe diagnostic: validates configured courier connectivity/auth via get_balance only.

    The endpoint reads the persisted courier configuration and performs a
    non-mutating provider connectivity check, so settings.read is the least
    privilege permission required here. It must not use the coarse role name
    "admin" as a permission identifier.
    """
    return await test_connection(db)
