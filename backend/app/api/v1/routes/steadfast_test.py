from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.steadfast_test_connection import test_connection
from app.core.database import get_db
from app.core.rbac import require_role

router = APIRouter(prefix="/admin/steadfast", tags=["admin-steadfast"])


@router.get("/test-connection")
async def test_steadfast_connection(
    db: AsyncSession = Depends(get_db),
    _admin=Depends(require_role("admin")),
):
    """Safe diagnostic: validates connectivity/auth via get_balance only."""
    return await test_connection(db)
