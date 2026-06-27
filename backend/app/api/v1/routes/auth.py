from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, require_admin
from app.models.models import AdminUser
from app.schemas.schemas import LoginRequest, TokenResponse, ApiResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == payload.email, AdminUser.is_active == True)  # noqa: E712
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    token = create_access_token(str(user.id))
    return ApiResponse(
        data=TokenResponse(access_token=token),
        message="Login successful",
    )


@router.get("/me", response_model=ApiResponse)
async def get_me(
    admin_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    result = await db.execute(select(AdminUser).where(AdminUser.id == UUID(admin_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(data={"id": str(user.id), "email": user.email, "name": user.name, "role": user.role})
