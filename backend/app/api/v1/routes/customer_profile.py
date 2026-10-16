"""Customer's own profile photo — stored on the server so it shows on every device.

The signed-in customer (OTP token → phone) can read, upload or remove their photo.
Images go to Cloudinary (small square), the URL is kept on the `customers` row.
"""
import asyncio

import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.security import require_customer
from app.models.customer import Customer
from app.schemas.schemas import ApiResponse

router = APIRouter(prefix="/customer", tags=["customer-profile"])

_ALLOWED = {"image/jpeg", "image/png", "image/webp"}
_MAX_BYTES = 3 * 1024 * 1024


def _is_real_image(data: bytes) -> bool:
    """Check the actual file bytes (not the browser's label): JPEG, PNG or WebP only.
    SVG/HTML or anything disguised as an image is refused."""
    return (data[:3] == bytes((0xFF, 0xD8, 0xFF))
            or data[:8] == bytes((0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))
            or (data[:4] == b"RIFF" and data[8:12] == b"WEBP"))


async def _customer(db: AsyncSession, phone: str) -> Customer | None:
    return (await db.execute(
        select(Customer).where(Customer.phone == phone, Customer.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()


@router.get("/avatar", response_model=ApiResponse)
async def get_avatar(phone: str = Depends(require_customer), db: AsyncSession = Depends(get_db)):
    c = await _customer(db, phone)
    return ApiResponse(data={"avatar_url": (c.avatar_url if c else None) or ""}, message="ok")


@router.post("/avatar", response_model=ApiResponse, dependencies=[Depends(rate_limit("customer_avatar", 10, 3600))])
async def upload_avatar(
    file: UploadFile = File(...),
    phone: str = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    if (file.content_type or "") not in _ALLOWED:
        raise HTTPException(status_code=400, detail="শুধু JPG, PNG বা WebP ছবি দিন")
    data = await file.read()
    if not data or len(data) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="ছবি ৩MB-এর কম হতে হবে")
    if not _is_real_image(data):
        raise HTTPException(status_code=400, detail="ফাইলটি আসল ছবি নয়")
    try:
        result = await asyncio.get_running_loop().run_in_executor(None, lambda: cloudinary.uploader.upload(
            data, folder="abo-enterprise/customer-avatars", resource_type="image",
            transformation=[{"width": 256, "height": 256, "crop": "fill", "gravity": "face"}],
        ))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ছবি আপলোড হয়নি — আবার চেষ্টা করুন") from exc
    url = result.get("secure_url") or ""
    if not url.startswith("https://res.cloudinary.com/"):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="ছবি আপলোড হয়নি — আবার চেষ্টা করুন")
    c = await _customer(db, phone)
    if c is None:
        c = Customer(phone=phone, name=phone)
        db.add(c)
    c.avatar_url = url
    await db.commit()
    return ApiResponse(data={"avatar_url": url}, message="ছবি সংরক্ষিত হয়েছে")


@router.delete("/avatar", response_model=ApiResponse, dependencies=[Depends(rate_limit("customer_avatar_del", 20, 3600))])
async def delete_avatar(phone: str = Depends(require_customer), db: AsyncSession = Depends(get_db)):
    c = await _customer(db, phone)
    if c is not None and c.avatar_url:
        c.avatar_url = None
        await db.commit()
    return ApiResponse(data={"avatar_url": ""}, message="ছবি সরানো হয়েছে")
