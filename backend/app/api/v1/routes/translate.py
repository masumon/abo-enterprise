"""Generic admin translation endpoint — Bangla→English (or any pair) for every
admin module's bilingual fields.

Gated on `require_admin` only (not a per-module write permission) because it is
a stateless text utility: any authenticated admin editing any module can use it
to fill an English field from Bangla. It writes nothing to the database.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import require_admin
from app.core.translate import translate_text
from app.schemas.schemas import ApiResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


class TranslateIn(BaseModel):
    text: str
    source: str = "bn"
    target: str = "en"


@router.post("/translate", response_model=ApiResponse)
async def admin_translate(payload: TranslateIn, _admin: str = Depends(require_admin)):
    """Translate arbitrary admin text. Returns {translated}; 502 on failure so
    the UI can prompt for a manual entry instead of saving the source text."""
    try:
        translated = translate_text(payload.text, payload.source, payload.target)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Admin translate failed: %s", exc)
        raise HTTPException(status_code=502, detail="Translation service unavailable")
    return ApiResponse(data={"translated": translated}, message="ok")
