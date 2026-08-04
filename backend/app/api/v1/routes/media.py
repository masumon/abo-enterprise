from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import require_admin
from app.core.rate_limit import rate_limit
from app.core.config import settings
from app.models.models import MediaAsset
import uuid
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/media", tags=["media"])

cloudinary.config(
    cloud_name=(settings.CLOUDINARY_CLOUD_NAME or "").strip(),
    api_key=(settings.CLOUDINARY_API_KEY or "").strip(),
    api_secret=(settings.CLOUDINARY_API_SECRET or "").strip(),
    secure=True,
)


# Formats a customer can realistically supply for a service booking. PDF is
# the dominant one — an NID, trade licence or passport scan is almost never a
# JPEG — and it was rejected outright by the admin uploader.
_BOOKING_DOC_TYPES = {
    "application/pdf": "raw",
    "image/jpeg": "image",
    "image/jpg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/heic": "image",
}
_BOOKING_DOC_MAX_BYTES = 10 * 1024 * 1024


def _sniffed_mime(head: bytes) -> str | None:
    """Best-effort magic-byte sniff so a renamed/relabelled file can't slip
    past the declared-Content-Type check above (browsers set that header
    from the file extension, which a client fully controls)."""
    if head.startswith(b"%PDF-"):
        return "application/pdf"
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[4:8] == b"ftyp" and head[8:12] in (b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"):
        return "image/heic"
    return None


@router.post(
    "/booking-upload",
    dependencies=[Depends(rate_limit("booking_doc_upload", 20, 600))],
)
async def upload_booking_document(file: UploadFile = File(...)):
    """Public document upload for a service booking.

    The only customer-facing upload path in the system: the admin uploader
    requires a session and accepts images/video only, so a customer could never
    supply the documents a service asks for. Returns a URL the booking form
    then submits on the booking; nothing is written to the admin media library.
    """
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File upload is not available right now. Please continue without attaching.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > _BOOKING_DOC_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File must be under 10MB")

    mime_type = (file.content_type or "").lower().strip()
    resource_type = _BOOKING_DOC_TYPES.get(mime_type)
    if not resource_type:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Upload a PDF or an image (JPG, PNG, WEBP, HEIC).",
        )
    sniffed = _sniffed_mime(contents[:64])
    # HEIC brand tables are non-exhaustive, so an unrecognized-but-still-HEIC
    # file only fails the check if sniffing found some *other*, mismatched
    # format — not simply because HEIC sniffing came back empty.
    if sniffed and sniffed != mime_type and not (mime_type == "image/heic" and sniffed is None):
        raise HTTPException(
            status_code=400,
            detail="File content doesn't match its declared type.",
        )

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder="abo-enterprise/booking-documents",
            resource_type=resource_type,
        )
    except Exception as exc:
        reason = str(exc).strip() or exc.__class__.__name__
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upload failed: {reason[:200]}",
        ) from exc

    return {
        "success": True,
        "data": {
            "url": result["secure_url"],
            "filename": file.filename,
            "mime_type": mime_type,
            "size": len(contents),
        },
    }


@router.post("/upload-with-metadata")
async def upload_with_metadata(
    file: UploadFile = File(...),
    folder: str = Query("abo-enterprise/uploads"),
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(require_admin),
):
    """Upload file and store metadata (width, height, size, format)"""
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured on the backend.",
        )

    contents = await file.read()
    file_size = len(contents)
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    mime_type = (file.content_type or "application/octet-stream").lower().strip()
    is_image = mime_type.startswith("image/")
    is_video = mime_type.startswith("video/")
    if not is_image and not is_video:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    max_size = 50 * 1024 * 1024 if is_video else 5 * 1024 * 1024
    if file_size > max_size:
        limit = "50MB" if is_video else "5MB"
        raise HTTPException(status_code=413, detail=f"File must be under {limit}")

    width = None
    height = None
    if is_image:
        try:
            from PIL import Image as PILImage
            from io import BytesIO

            img = PILImage.open(BytesIO(contents))
            width, height = img.size
        except Exception:
            width, height = None, None

    safe_folder = folder.strip("/").replace("..", "") or "abo-enterprise/uploads"
    upload_opts: dict = {"folder": safe_folder}
    if is_video:
        upload_opts["resource_type"] = "video"
    else:
        upload_opts["resource_type"] = "image"
        upload_opts["transformation"] = [{"quality": "auto", "fetch_format": "auto"}]

    try:
        cloudinary_result = cloudinary.uploader.upload(contents, **upload_opts)
        media_asset = MediaAsset(
            id=uuid.uuid4(),
            url=cloudinary_result["secure_url"],
            filename=file.filename,
            folder=safe_folder,
            file_size=file_size,
            mime_type=mime_type,
            width=cloudinary_result.get("width") or width,
            height=cloudinary_result.get("height") or height,
            format=cloudinary_result.get("format"),
            cloudinary_public_id=cloudinary_result.get("public_id"),
            uploaded_by=admin_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        db.add(media_asset)
        await db.commit()
        await db.refresh(media_asset)
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        reason = str(exc).strip() or exc.__class__.__name__
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Media upload failed: {reason[:200]}. Verify Cloudinary credentials and quota.",
        ) from exc

    return {
        "success": True,
        "data": {
            "id": str(media_asset.id),
            "url": media_asset.url,
            "public_id": media_asset.cloudinary_public_id,
            "width": media_asset.width,
            "height": media_asset.height,
            "size": media_asset.file_size,
            "format": media_asset.format,
        },
    }


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
