"""Static and database-backed knowledge retrieval."""

import json
import re
from pathlib import Path

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Product, Service, ServicePricingTier, Setting, BlogPost
from app.core.config import settings

_FAQ_PATH = Path(__file__).parent / "data" / "faq_knowledge.json"

_DEFAULT_COUPONS: dict[str, dict] = {
    "ABO10": {"discount_percent": 10, "min_subtotal": 0, "active": True},
    "WELCOME": {"discount_percent": 5, "min_subtotal": 500, "active": True},
}


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

    def list_faq_topics(self) -> list[str]:
        return sorted({k.rsplit("_", 1)[0] for k in self._faq if k.endswith(("_en", "_bn"))})

    def search_faq(self, query: str, language: str = "en", limit: int = 3, min_score: float = 0.0) -> list[dict]:
        """Keyword search across FAQ keys, admin-defined questions, and answers.

        The `{key}_q` field holds customer questions/keywords the admin
        entered for that answer — matches there weigh the most, so admins
        can teach the assistant new answers without code changes.
        """
        if not query.strip():
            return []
        q = query.lower()
        tokens = [t for t in re.findall(r"[\wঀ-৿]+", q) if len(t) >= 2]
        results: list[tuple[float, dict]] = []
        seen: set[str] = set()

        for topic in self.list_faq_topics():
            if topic in seen:
                continue
            answer = self.get_faq(topic, language) or ""
            questions = (self._faq.get(f"{topic}_q") or "").lower()
            haystack = f"{topic} {answer}".lower()
            score = 0.0
            if questions:
                if q in questions:
                    score += 4.0
                for token in tokens:
                    if token in questions:
                        score += 2.0
            if q in haystack:
                score += 2.0
            for token in tokens:
                if token in haystack:
                    score += 1.0
            if score > max(min_score, 0):
                seen.add(topic)
                results.append((score, {"key": topic, "answer": answer}))

        results.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in results[:limit]]

    async def get_contact_info(self, db: AsyncSession, language: str = "en") -> dict:
        keys = [
            "contact_phone", "contact_email", "contact_address", "whatsapp_number",
            "business_phone", "business_email", "business_address", "site_name",
            "business_hours_en", "business_hours_bn",
        ]
        result = await db.execute(
            select(Setting).where(
                Setting.key.in_(keys),
                Setting.is_deleted == False,  # noqa: E712
            )
        )
        data = {s.key: s.value for s in result.scalars().all()}
        hours = data.get("business_hours_bn" if language == "bn" else "business_hours_en")
        if not hours:
            hours = data.get("business_hours_en") or data.get("business_hours_bn")
        return {
            "phone": data.get("contact_phone") or data.get("business_phone") or settings.WHATSAPP_NUMBER,
            "email": data.get("contact_email") or data.get("business_email") or settings.BUSINESS_EMAIL,
            "whatsapp": data.get("whatsapp_number") or settings.WHATSAPP_NUMBER,
            "address": data.get("contact_address") or data.get("business_address", ""),
            "site_name": data.get("site_name", "ABO Enterprise"),
            "business_hours": hours,
        }

    async def get_delivery_info(self, db: AsyncSession, language: str = "en") -> dict:
        keys = [
            "delivery_charge_dhaka", "delivery_charge_outside", "delivery_charge_sylhet",
            "delivery_time_en", "delivery_time_bn", "free_delivery_min",
        ]
        settings_map = await self.get_site_settings(db, keys)
        base_faq = self.get_faq("delivery", language) or ""
        return {
            "summary": base_faq,
            "dhaka_charge": settings_map.get("delivery_charge_dhaka"),
            "outside_charge": settings_map.get("delivery_charge_outside"),
            "sylhet_charge": settings_map.get("delivery_charge_sylhet"),
            "delivery_time": settings_map.get("delivery_time_bn" if language == "bn" else "delivery_time_en"),
            "free_delivery_min": settings_map.get("free_delivery_min"),
        }

    async def get_site_settings(self, db: AsyncSession, keys: list[str]) -> dict[str, str]:
        if not keys:
            return {}
        result = await db.execute(
            select(Setting).where(Setting.key.in_(keys), Setting.is_deleted == False)  # noqa: E712
        )
        return {s.key: s.value for s in result.scalars().all() if not s.is_secret}

    async def get_assistant_welcome(self, db: AsyncSession, language: str = "en") -> str | None:
        keys = ("assistant_welcome_bn", "assistant_welcome_en") if language == "bn" else ("assistant_welcome_en", "assistant_welcome_bn")
        data = await self.get_site_settings(db, list(keys))
        return data.get(keys[0]) or data.get(keys[1]) or None

    @staticmethod
    def _query_tokens(query: str) -> list[str]:
        return [t for t in re.findall(r"[\wঀ-৿]+", query.lower()) if len(t) >= 3]

    async def search_products(
        self, db: AsyncSession, query: str, limit: int = 5, category: str | None = None, brand: str | None = None
    ) -> list[Product]:
        base = [Product.is_active == True, Product.is_deleted == False]  # noqa: E712
        if category:
            base.append(Product.category.ilike(f"%{category}%"))
        if brand:
            base.append(Product.brand.ilike(f"%{brand}%"))

        def _text_match(term: str):
            like = f"%{term}%"
            return or_(
                Product.name_en.ilike(like),
                Product.name_bn.ilike(like),
                Product.sku.ilike(like),
                Product.brand.ilike(like),
                Product.description_en.ilike(like),
                Product.description_bn.ilike(like),
                Product.category.ilike(like),
            )

        conditions = list(base)
        if query:
            conditions.append(_text_match(query))
        result = await db.execute(
            select(Product).where(and_(*conditions)).order_by(Product.sort_order.asc()).limit(limit)
        )
        found = list(result.scalars().all())
        if found or not query:
            return found

        # Full phrase missed — retry matching any individual word so
        # multi-word queries like "gaming laptop dam" still find "Laptop".
        tokens = self._query_tokens(query)
        if not tokens:
            return []
        result = await db.execute(
            select(Product)
            .where(and_(*base, or_(*[_text_match(t) for t in tokens])))
            .order_by(Product.sort_order.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_product_by_slug_or_name(self, db: AsyncSession, identifier: str) -> Product | None:
        if not identifier:
            return None
        result = await db.execute(
            select(Product).where(
                Product.is_deleted == False,  # noqa: E712
                or_(
                    Product.slug == identifier,
                    Product.name_en.ilike(identifier),
                    Product.name_bn.ilike(identifier),
                    Product.sku.ilike(identifier),
                ),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_product_by_slug(self, db: AsyncSession, slug: str) -> Product | None:
        if not slug:
            return None
        result = await db.execute(
            select(Product).where(Product.slug == slug, Product.is_deleted == False).limit(1)  # noqa: E712
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
        base = [Service.is_active == True, Service.is_deleted == False]  # noqa: E712

        def _text_match(term: str):
            like = f"%{term}%"
            return or_(
                Service.name_en.ilike(like),
                Service.name_bn.ilike(like),
                Service.description_en.ilike(like),
                Service.description_bn.ilike(like),
                Service.short_description_en.ilike(like),
                Service.short_description_bn.ilike(like),
                Service.category.ilike(like),
            )

        conditions = list(base)
        if query:
            conditions.append(_text_match(query))
        result = await db.execute(
            select(Service).where(and_(*conditions)).order_by(Service.sort_order.asc()).limit(limit)
        )
        found = list(result.scalars().all())
        if found or not query:
            return found

        tokens = self._query_tokens(query)
        if not tokens:
            return []
        result = await db.execute(
            select(Service)
            .where(and_(*base, or_(*[_text_match(t) for t in tokens])))
            .order_by(Service.sort_order.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_service_by_slug_or_name(self, db: AsyncSession, identifier: str) -> Service | None:
        if not identifier:
            return None
        result = await db.execute(
            select(Service).where(
                Service.is_deleted == False,  # noqa: E712
                or_(Service.slug == identifier, Service.name_en.ilike(identifier), Service.name_bn.ilike(identifier)),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_service_with_tiers(self, db: AsyncSession, identifier: str) -> tuple[Service | None, list[ServicePricingTier]]:
        service = await self.get_service_by_slug_or_name(db, identifier)
        if not service:
            return None, []
        result = await db.execute(
            select(ServicePricingTier).where(
                ServicePricingTier.service_id == service.id,
                ServicePricingTier.is_active == True,  # noqa: E712
                ServicePricingTier.is_deleted == False,  # noqa: E712
            ).order_by(ServicePricingTier.sort_order.asc().nullslast())
        )
        return service, list(result.scalars().all())

    async def get_recent_blog_posts(self, db: AsyncSession, limit: int = 3) -> list[BlogPost]:
        result = await db.execute(
            select(BlogPost).where(
                BlogPost.status == "published",
                BlogPost.is_deleted == False,  # noqa: E712
            ).order_by(BlogPost.published_at.desc().nullslast()).limit(limit)
        )
        return list(result.scalars().all())

    async def search_blog_posts(self, db: AsyncSession, query: str = "", limit: int = 3) -> list[BlogPost]:
        conditions = [BlogPost.status == "published", BlogPost.is_deleted == False]  # noqa: E712
        if query:
            term = f"%{query}%"
            conditions.append(
                or_(
                    BlogPost.title_en.ilike(term),
                    BlogPost.title_bn.ilike(term),
                    BlogPost.excerpt_en.ilike(term),
                    BlogPost.excerpt_bn.ilike(term),
                    BlogPost.content_en.ilike(term),
                )
            )
        result = await db.execute(
            select(BlogPost).where(and_(*conditions)).order_by(BlogPost.published_at.desc().nullslast()).limit(limit)
        )
        return list(result.scalars().all())

    async def load_coupons(self, db: AsyncSession) -> dict[str, dict]:
        result = await db.execute(
            select(Setting).where(Setting.key == "coupons_json", Setting.is_deleted == False)  # noqa: E712
        )
        row = result.scalar_one_or_none()
        if not row or not row.value:
            return dict(_DEFAULT_COUPONS)
        try:
            parsed = json.loads(row.value)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
        return dict(_DEFAULT_COUPONS)

    async def get_coupon(self, db: AsyncSession, code: str) -> dict | None:
        coupons = await self.load_coupons(db)
        entry = coupons.get(code.strip().upper())
        if not entry or not entry.get("active", True):
            return None
        discount_raw = entry.get("discount_percent", entry.get("discount_rate", 0))
        rate = float(discount_raw)
        if rate > 1:
            rate = rate / 100
        return {
            "code": code.strip().upper(),
            "discount_percent": round(rate * 100, 2),
            "min_subtotal": float(entry.get("min_subtotal", 0)),
        }

    def product_to_dict(self, product: Product) -> dict:
        return {
            "id": str(product.id),
            "name_en": product.name_en,
            "name_bn": product.name_bn,
            "price": float(product.price),
            "stock_quantity": product.stock_quantity,
            "description_en": product.description_en,
            "description_bn": product.description_bn,
            "slug": product.slug,
            "category": product.category,
            "brand": product.brand,
        }

    def service_to_dict(self, service: Service, tiers: list[ServicePricingTier] | None = None) -> dict:
        data = {
            "name_en": service.name_en,
            "name_bn": service.name_bn,
            "slug": service.slug,
            "description_en": service.description_en or service.short_description_en,
            "description_bn": service.description_bn or service.short_description_bn,
            "pricing_type": service.pricing_type,
            "base_price": float(service.base_price) if service.base_price is not None else None,
            "min_price": float(service.min_price) if service.min_price is not None else None,
            "max_price": float(service.max_price) if service.max_price is not None else None,
            "hourly_rate": float(service.hourly_rate) if service.hourly_rate is not None else None,
        }
        if tiers:
            data["tiers"] = [
                {"name": t.tier_name, "price": float(t.price), "duration_days": t.duration_days}
                for t in tiers
            ]
        return data
