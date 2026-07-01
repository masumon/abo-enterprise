from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import MediaAsset
import uuid
from datetime import datetime, timezone
import mimetypes

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload-with-metadata")
async def upload_with_metadata(
    file: UploadFile = File(...),
    folder: str = "abo-enterprise/uploads",
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
):
    """Upload file and store metadata (width, height, size, format)"""
    try:
        contents = await file.read()
        file_size = len(contents)

        mime_type = file.content_type or "application/octet-stream"
        format = mime_type.split("/")[-1] if "/" in mime_type else "unknown"

        width = None
        height = None
        if mime_type.startswith("image/"):
            try:
                from PIL import Image as PILImage
                from io import BytesIO
                img = PILImage.open(BytesIO(contents))
                width, height = img.size
            except Exception:
                pass

        media_asset = MediaAsset(
            id=uuid.uuid4(),
            url=f"https://res.cloudinary.com/{folder}/{file.filename}",
            filename=file.filename,
            folder=folder,
            file_size=file_size,
            mime_type=mime_type,
            width=width,
            height=height,
            format=format,
            uploaded_by=getattr(admin, "username", "unknown"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(media_asset)
        await db.commit()

        return {
            "success": True,
            "data": {
                "id": str(media_asset.id),
                "url": media_asset.url,
                "width": width,
                "height": height,
                "size": file_size,
                "format": format,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assets")
async def list_assets(
    folder: str = "abo-enterprise/uploads",
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
):
    """List all media assets with metadata"""
    result = await db.execute(
        select(MediaAsset).where(
            MediaAsset.folder == folder,
            MediaAsset.is_deleted == False,
        ).order_by(MediaAsset.created_at.desc())
    )
    assets = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id": str(a.id),
                "url": a.url,
                "filename": a.filename,
                "width": a.width,
                "height": a.height,
                "size": a.file_size,
                "format": a.format,
                "uploaded_at": a.created_at.isoformat(),
                "uploaded_by": a.uploaded_by,
                "tags": a.tags,
            }
            for a in assets
        ]
    }


@router.get("/assets/{asset_id}")
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
):
    """Get single asset with metadata"""
    try:
        asset_uuid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == asset_uuid)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return {
        "success": True,
        "data": {
            "id": str(asset.id),
            "url": asset.url,
            "filename": asset.filename,
            "width": asset.width,
            "height": asset.height,
            "size": asset.file_size,
            "format": asset.format,
            "alt_text": asset.alt_text,
            "tags": asset.tags,
            "uploaded_at": asset.created_at.isoformat(),
            "uploaded_by": asset.uploaded_by,
        }
    }


@router.patch("/assets/{asset_id}")
async def update_asset(
    asset_id: str,
    alt_text: str = None,
    tags: list = None,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
):
    """Update asset metadata"""
    try:
        asset_uuid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == asset_uuid)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if alt_text is not None:
        asset.alt_text = alt_text
    if tags is not None:
        asset.tags = tags

    await db.commit()

    return {
        "success": True,
        "data": {"id": str(asset.id), "alt_text": asset.alt_text, "tags": asset.tags}
    }


@router.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin),
):
    """Soft delete asset"""
    try:
        asset_uuid = uuid.UUID(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    result = await db.execute(
        select(MediaAsset).where(MediaAsset.id == asset_uuid)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_deleted = True
    await db.commit()

    return {"success": True, "message": "Asset deleted"}
