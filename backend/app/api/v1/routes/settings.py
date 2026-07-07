from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token, require_admin
from app.models.models import AdminUser, Setting
from app.schemas.schemas import SettingOut, SettingUpdate, SettingCreate, ApiResponse
from typing import Any

router = APIRouter(prefix="/settings", tags=["settings"])
logger = logging.getLogger(__name__)

_PUBLIC_SETTING_EXACT_KEYS = {
    "google_maps_embed",
    "timezone",
    "maintenance_mode",
    "trade_license",
    "whatsapp_number",
    "contact_phone",
    "contact_email",
    "contact_address",
    "business_email",
    "facebook_url",
    "instagram_url",
    "linkedin_url",
    "youtube_url",
}

_PUBLIC_SETTING_PREFIXES = (
    "site_",
    "seo_",
    "hero_",
    "about_",
    "contact_",
    "social_",
    "feature_",
    "flash_sale_",
    "delivery_",
    "free_delivery_",
    "checkout_",
    "courier_",
    "warmup_",
    "showcase_",
    "software_",
    "client_",
    "product_",
    "service_",
    "review_",
)


def _is_public_setting_key(key: str) -> bool:
    if key in _PUBLIC_SETTING_EXACT_KEYS:
        return True
    return any(key.startswith(prefix) for prefix in _PUBLIC_SETTING_PREFIXES)


async def _is_admin_request(request: Request, db: AsyncSession) -> bool:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return False

    token = auth.split(" ", 1)[1].strip()
    if not token:
        return False

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return False
        admin_id = payload.get("sub")
        admin_uuid = UUID(admin_id)
    except Exception:
        return False

    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_uuid, AdminUser.is_active == True)  # noqa: E712
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=ApiResponse)
async def get_all_settings(request: Request, db: AsyncSession = Depends(get_db)):
    """Get all settings (public)"""
    result = await db.execute(select(Setting).where(Setting.is_deleted == False))
    settings = result.scalars().all()
    is_admin = await _is_admin_request(request, db)

    settings_dict = {}
    for setting in settings:
        if setting.is_secret:
            if is_admin:
                settings_dict[setting.key] = "***HIDDEN***"
            continue

        if is_admin or _is_public_setting_key(setting.key):
            settings_dict[setting.key] = setting.value

    if not is_admin:
        logger.info("Public settings response filtered: %s keys", len(settings_dict))

    return ApiResponse(success=True, data=settings_dict, message="Settings retrieved")


@router.post("/upsert", response_model=ApiResponse, dependencies=[Depends(require_admin)])
async def upsert_settings(payload: list[SettingCreate], db: AsyncSession = Depends(get_db)):
    """Create or update multiple settings at once (admin only)"""
    results = []
    for item in payload:
        if item.value == "***HIDDEN***":
            continue
        result = await db.execute(
            select(Setting).where((Setting.key == item.key) & (Setting.is_deleted == False))
        )
        setting = result.scalar_one_or_none()
        if setting:
            if not setting.is_editable:
                continue
            setting.value = item.value
            if item.data_type:
                setting.data_type = item.data_type
            if item.description is not None:
                setting.description = item.description
        else:
            setting = Setting(**item.model_dump())
            db.add(setting)
        results.append({"key": item.key, "value": item.value})

    await db.commit()
    return ApiResponse(success=True, data=results, message=f"{len(results)} settings saved")


@router.get("/{key}", response_model=ApiResponse)
async def get_setting(key: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Get specific setting by key"""
    result = await db.execute(
        select(Setting).where((Setting.key == key) & (Setting.is_deleted == False))
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    if setting.is_secret:
        raise HTTPException(status_code=403, detail="Cannot access secret settings")

    is_admin = await _is_admin_request(request, db)
    if not is_admin and not _is_public_setting_key(setting.key):
        raise HTTPException(status_code=403, detail="Setting is not public")

    return ApiResponse(success=True, data={"key": setting.key, "value": setting.value})


@router.put("/{key}", response_model=ApiResponse, dependencies=[Depends(require_admin)])
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    """Update setting (admin only)"""
    result = await db.execute(
        select(Setting).where((Setting.key == key) & (Setting.is_deleted == False))
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    if not setting.is_editable:
        raise HTTPException(status_code=403, detail="This setting is not editable")

    setting.value = data.value
    if data.is_editable is not None:
        setting.is_editable = data.is_editable

    db.add(setting)
    await db.commit()
    await db.refresh(setting)

    return ApiResponse(
        success=True,
        data={"key": setting.key, "value": setting.value},
        message=f"Setting '{key}' updated successfully"
    )


@router.post("/{key}", response_model=ApiResponse, dependencies=[Depends(require_admin)])
async def create_setting(key: str, value: str, db: AsyncSession = Depends(get_db)):
    """Create new setting (admin only)"""
    existing = await db.execute(
        select(Setting).where((Setting.key == key) & (Setting.is_deleted == False))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Setting already exists")

    new_setting = Setting(key=key, value=value)
    db.add(new_setting)
    await db.commit()
    await db.refresh(new_setting)

    return ApiResponse(
        success=True,
        data=SettingOut.model_validate(new_setting),
        message="Setting created successfully"
    )
