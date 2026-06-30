"""Static and database-backed knowledge retrieval."""

import json
from pathlib import Path

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Product, Service, Setting, BlogPost
from app.core.config import settings

_FAQ_PATH = Path(__file__).parent / "data" / "faq_knowledge.json"


class KnowledgeBase:
    def __init__(self) -> None:
        with open(_FAQ_PATH, encoding="utf-8") as f:
            self._faq = json.load(f)

    def reload_faq(self, flat: dict) -> None:
        self._faq = flat

    async def load_faq_from_db(self, db: AsyncSession) -> None:
        result = await db.execute(
            select(Setting).where(Setting.key == "assistant_faq_knowledge", Setting.is_deleted == False)  # noqa: E712
        )
        setting = result.scalar_one_or_none()
        if setting and setting.value:
            try:
                self._faq = json.loads(setting.value)
            except json.JSONDecodeError:
                pass

    def get_faq(self, key: str, language: str = "en") -> str | None:
        suffix = "_bn" if language == "bn" else "_en"
        return self._faq.get(f"{key}{suffix}") or self._faq.get(f"{key}_en")

    async def get_contact_info(self, db: AsyncSession) -> dict:
        keys = [
            "contact_phone", "contact_email", "contact_address", "whatsapp_number",
            "business_phone", "business_email", "business_address", "site_name",
        ]
        result = await db.execute(
            select(Setting).where(
                Setting.key.in_(keys),
                Setting.is_deleted == False,  # noqa: E712
            )
        )
        data = {s.key: s.value for s in result.scalars().all()}
        return {
            "phone": data.get("contact_phone") or data.get("business_phone") or settings.WHATSAPP_NUMBER,
            "email": data.get("contact_email") or data.get("business_email") or settings.BUSINESS_EMAIL,
            "whatsapp": data.get("whatsapp_number") or settings.WHATSAPP_NUMBER,
            "address": data.get("contact_address") or data.get("business_address", ""),
            "site_name": data.get("site_name", "ABO Enterprise"),
        }

    async def get_site_settings(self, db: AsyncSession, keys: list[str]) -> dict[str, str]:
        if not keys:
            return {}
        result = await db.execute(
            select(Setting).where(Setting.key.in_(keys), Setting.is_deleted == False)  # noqa: E712
        )
        return {s.key: s.value for s in result.scalars().all() if not s.is_secret}

    async def search_products(
        self, db: AsyncSession, query: str, limit: int = 5, category: str | None = None, brand: str | None = None
    ) -> list[Product]:
        conditions = [Product.is_active == True, Product.is_deleted == False]  # noqa: E712
        if category:
            conditions.append(Product.category.ilike(f"%{category}%"))
        if brand:
            conditions.append(Product.brand.ilike(f"%{brand}%"))
        if query:
            term = f"%{query}%"
            conditions.append(
                or_(
                    Product.name_en.ilike(term),
                    Product.name_bn.ilike(term),
                    Product.sku.ilike(term),
                    Product.brand.ilike(term),
                )
            )
        result = await db.execute(
            select(Product).where(and_(*conditions)).order_by(Product.sort_order.asc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_product_by_slug_or_name(self, db: AsyncSession, identifier: str) -> Product | None:
        result = await db.execute(
            select(Product).where(
                Product.is_deleted == False,  # noqa: E712
                or_(Product.slug == identifier, Product.name_en.ilike(identifier), Product.name_bn.ilike(identifier)),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def list_categories(self, db: AsyncSession) -> list[str]:
        result = await db.execute(
            select(Product.category).where(
                Product.is_active == True, Product.is_deleted == False  # noqa: E712
            ).distinct()
        )
        return sorted({r[0] for r in result.all() if r[0]})

    async def list_brands(self, db: AsyncSession) -> list[str]:
        result = await db.execute(
            select(Product.brand).where(
                Product.is_active == True,
                Product.is_deleted == False,  # noqa: E712
                Product.brand.isnot(None),
            ).distinct()
        )
        return sorted({r[0] for r in result.all() if r[0]})

    async def search_services(self, db: AsyncSession, query: str = "", limit: int = 5) -> list[Service]:
        conditions = [Service.is_active == True, Service.is_deleted == False]  # noqa: E712
        if query:
            term = f"%{query}%"
            conditions.append(or_(Service.name_en.ilike(term), Service.name_bn.ilike(term)))
        result = await db.execute(
            select(Service).where(and_(*conditions)).order_by(Service.sort_order.asc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_service_by_slug_or_name(self, db: AsyncSession, identifier: str) -> Service | None:
        result = await db.execute(
            select(Service).where(
                Service.is_deleted == False,  # noqa: E712
                or_(Service.slug == identifier, Service.name_en.ilike(identifier), Service.name_bn.ilike(identifier)),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_recent_blog_posts(self, db: AsyncSession, limit: int = 3) -> list[BlogPost]:
        result = await db.execute(
            select(BlogPost).where(
                BlogPost.status == "published",
                BlogPost.is_deleted == False,  # noqa: E712
            ).order_by(BlogPost.published_at.desc().nullslast()).limit(limit)
        )
        return list(result.scalars().all())
