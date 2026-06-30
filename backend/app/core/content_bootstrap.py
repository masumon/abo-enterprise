"""Idempotent content bootstrap — seeds defaults only when missing. Never overwrites production data."""
import logging
from datetime import datetime, timezone

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.models import BlogPost, PaymentMethod, Product, Service, Setting

logger = logging.getLogger(__name__)

DEFAULT_MAPS_EMBED = (
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d28915.5!2d91.8687!3d24.8949!"
    "2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x375029b0c9e5f0a5%3A0x8dfd1bd2e54e9c5!"
    "2sSylhet%2C%20Bangladesh!5e0!3m2!1sen!2sbd!4v1719590400000!5m2!1sen!2sbd"
)

DEFAULT_SETTINGS: list[dict] = [
    {
        "key": "google_maps_embed",
        "value": DEFAULT_MAPS_EMBED,
        "data_type": "string",
        "description": "Google Maps embed URL for contact page",
    },
    {
        "key": "contact_address",
        "value": "Hazi Bahar Uddin Market, Sylhet-3170, Bangladesh",
        "data_type": "string",
        "description": "Business address",
    },
    {
        "key": "contact_phone",
        "value": "01825007977",
        "data_type": "string",
        "description": "Contact phone",
    },
    {
        "key": "contact_email",
        "value": "abo.enterprise@gmail.com",
        "data_type": "string",
        "description": "Contact email",
    },
    {
        "key": "demo_fallback_enabled",
        "value": "true",
        "data_type": "string",
        "description": "Show demo catalog when API is slow/unavailable",
    },
    {
        "key": "checkout_confirm_channel",
        "value": "whatsapp",
        "data_type": "string",
        "description": "Order confirm: whatsapp | email | both | none",
    },
    {
        "key": "checkout_otp_required",
        "value": "false",
        "data_type": "string",
        "description": "Require phone OTP at checkout (true/false)",
    },
    {
        "key": "whatsapp_number",
        "value": "8801825007977",
        "data_type": "string",
        "description": "WhatsApp number for orders (880...)",
    },
    {
        "key": "delivery_charge_sylhet",
        "value": "0",
        "data_type": "string",
        "description": "Delivery charge Sylhet division (BDT)",
    },
    {
        "key": "delivery_charge_dhaka",
        "value": "60",
        "data_type": "string",
        "description": "Delivery charge Dhaka metro (BDT)",
    },
    {
        "key": "delivery_charge_outside",
        "value": "120",
        "data_type": "string",
        "description": "Delivery charge outside Dhaka/Sylhet (BDT)",
    },
    {
        "key": "free_delivery_min_amount",
        "value": "2000",
        "data_type": "string",
        "description": "Free delivery above this subtotal (BDT)",
    },
    {
        "key": "trade_license",
        "value": "",
        "data_type": "string",
        "description": "Trade license / TIN for footer trust",
    },
]

PRODUCT_SEED = [
    ("phone-case-premium", "Premium Phone Case", "প্রিমিয়াম ফোন কেস", 299, 500, "accessories", "HOT", 50, True, 1),
    ("fast-charger-65w", "Fast Charger 65W", "ফাস্ট চার্জার ৬৫W", 599, 800, "accessories", "SALE", 30, True, 2),
    ("earbuds-tws-pro", "Earbuds TWS Pro", "ওয়্যারলেস ইয়ারবাড প্রো", 999, 1500, "gadgets", "NEW", 20, True, 3),
    ("power-bank-20000", "Power Bank 20000mAh", "পাওয়ার ব্যাংক ২০০০০mAh", 1299, None, "gadgets", None, 15, True, 4),
    ("glass-protector", "Tempered Glass Protector", "টেম্পার্ড গ্লাস প্রটেক্টর", 250, None, "accessories", None, 100, True, 5),
    ("type-c-cable-3m", "Type-C Cable 3M Braided", "টাইপ-সি ব্রেডেড ক্যাবল ৩M", 199, None, "accessories", None, 200, False, 6),
    ("car-holder-magnetic", "Magnetic Car Holder", "ম্যাগনেটিক কার হোল্ডার", 399, None, "accessories", None, 40, False, 7),
    ("bt-speaker-waterproof", "Waterproof BT Speaker", "ওয়াটারপ্রুফ স্পিকার", 1499, 2000, "gadgets", None, 10, False, 8),
]

SERVICE_SEED = [
    ("printing", "Printing Services", "প্রিন্টিং সেবা", "printing", "fixed", 500, True, 1),
    ("legal", "Legal Assistance", "আইনি সহায়তা", "legal", "custom_quote", None, True, 2),
    ("software", "Software Development", "সফটওয়্যার ডেভেলপমেন্ট", "software", "custom_quote", None, True, 3),
    ("web-design", "Website Design", "ওয়েবসাইট ডিজাইন", "software", "package", 15000, False, 4),
    ("mobile-app", "Mobile App Development", "মোবাইল অ্যাপ ডেভেলপমেন্ট", "software", "custom_quote", None, False, 5),
    ("digital-marketing", "Digital Marketing", "ডিজিটাল মার্কেটিং", "marketing", "package", 8000, False, 6),
]

BLOG_SEED = [
    {
        "slug": "welcome-abo-enterprise",
        "title_en": "Welcome to ABO Enterprise",
        "title_bn": "ABO Enterprise-এ স্বাগতম",
        "content_en": (
            "<p>ABO Enterprise is Bangladesh's complete technology ecosystem — "
            "offering mobile accessories, printing, legal assistance, and custom software solutions.</p>"
            "<p>Based in Sylhet, we serve businesses nationwide with quality products and professional services.</p>"
        ),
        "content_bn": (
            "<p>ABO Enterprise বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম — "
            "মোবাইল এক্সেসরিজ, প্রিন্টিং, আইনি সহায়তা ও কাস্টম সফটওয়্যার সমাধান।</p>"
            "<p>সিলেট ভিত্তিক, আমরা সারাদেশে মানসম্মত পণ্য ও পেশাদার সেবা প্রদান করি।</p>"
        ),
        "excerpt_en": "Discover how ABO Enterprise brings products, services, and software under one roof.",
        "excerpt_bn": "ABO Enterprise কীভাবে পণ্য, সেবা ও সফটওয়্যার এক ছাদের নিচে নিয়ে আসে।",
        "category": "announcement",
        "status": "published",
        "is_featured": True,
    },
    {
        "slug": "mobile-accessories-guide",
        "title_en": "How to Choose the Right Mobile Accessories",
        "title_bn": "সঠিক মোবাইল এক্সেসরিজ বেছে নেওয়ার গাইড",
        "content_en": (
            "<p>Quality phone cases, chargers, and screen protectors extend your device's life. "
            "Look for certified fast chargers, tempered glass with 9H hardness, and cases with proper drop protection.</p>"
        ),
        "content_bn": (
            "<p>মানসম্মত ফোন কেস, চার্জার ও স্ক্রিন প্রটেক্টর আপনার ডিভাইসের আয়ু বাড়ায়। "
            "সার্টিফাইড ফাস্ট চার্জার, ৯H হার্ডনেস টেম্পার্ড গ্লাস ও ড্রপ প্রটেকশন কেস খুঁজুন।</p>"
        ),
        "excerpt_en": "Tips for picking durable, value-for-money mobile accessories in Bangladesh.",
        "excerpt_bn": "বাংলাদেশে টেকসই ও সাশ্রয়ী মোবাইল এক্সেসরিজ বেছে নেওয়ার টিপস।",
        "category": "tips",
        "status": "published",
        "is_featured": False,
    },
]


async def _ensure_setting(db, key: str, value: str, data_type: str = "string", description: str | None = None) -> None:
    result = await db.execute(
        select(Setting).where(Setting.key == key, Setting.is_deleted == False)  # noqa: E712
    )
    if result.scalar_one_or_none():
        return
    db.add(Setting(key=key, value=value, data_type=data_type, description=description, is_editable=True))
    logger.info("Content bootstrap: created setting '%s'", key)


async def bootstrap_content() -> None:
    """Seed default settings, products, and blog posts only when tables are empty."""
    try:
        async with AsyncSessionLocal() as db:
            for item in DEFAULT_SETTINGS:
                await _ensure_setting(db, **item)

            product_count = (await db.execute(
                select(func.count(Product.id)).where(Product.is_deleted == False)  # noqa: E712
            )).scalar() or 0

            if product_count == 0:
                for row in PRODUCT_SEED:
                    slug, name_en, name_bn, price, orig, cat, badge, stock, featured, sort = row
                    db.add(Product(
                        slug=slug,
                        name_en=name_en,
                        name_bn=name_bn,
                        price=price,
                        original_price=orig,
                        category=cat,
                        badge=badge,
                        stock_quantity=stock,
                        is_active=True,
                        is_featured=featured,
                        sort_order=sort,
                        images=[],
                        specifications={},
                        tags=[],
                    ))
                logger.info("Content bootstrap: seeded %d products", len(PRODUCT_SEED))

            service_count = (await db.execute(
                select(func.count(Service.id)).where(Service.is_deleted == False)  # noqa: E712
            )).scalar() or 0

            if service_count == 0:
                for row in SERVICE_SEED:
                    slug, name_en, name_bn, cat, pricing_type, base_price, featured, sort = row
                    db.add(Service(
                        slug=slug,
                        name_en=name_en,
                        name_bn=name_bn,
                        short_description_en=f"Professional {name_en.lower()} from ABO Enterprise.",
                        short_description_bn=f"ABO Enterprise থেকে পেশাদার {name_bn}।",
                        category=cat,
                        pricing_type=pricing_type,
                        base_price=base_price,
                        is_active=True,
                        is_featured=featured,
                        sort_order=sort,
                        tags=[],
                        process_steps=[],
                        benefits=[],
                        requirements=[],
                        required_documents=[],
                        faq=[],
                    ))
                logger.info("Content bootstrap: seeded %d services", len(SERVICE_SEED))

            published_count = (await db.execute(
                select(func.count(BlogPost.id)).where(
                    BlogPost.is_deleted == False,  # noqa: E712
                    BlogPost.status == "published",
                )
            )).scalar() or 0

            if published_count == 0:
                now = datetime.now(timezone.utc)
                for post in BLOG_SEED:
                    db.add(BlogPost(
                        **post,
                        author_name="ABO Enterprise",
                        published_at=now,
                        tags=[],
                    ))
                logger.info("Content bootstrap: seeded %d blog posts", len(BLOG_SEED))

            pm_count = (await db.execute(select(func.count(PaymentMethod.id)))).scalar() or 0
            if pm_count == 0:
                phone = "01825007977"
                for sort, (gw, acct, desc) in enumerate([
                    ("bkash", phone, "Send Money to this bKash number"),
                    ("nagad", phone, "Send Money to this Nagad number"),
                    ("rocket", phone, "Send Money to this Rocket number"),
                    ("bank", "A/C: 1075869070001", "BRAC Bank transfer"),
                    ("cod", "", "Pay when you receive the order"),
                ]):
                    db.add(PaymentMethod(
                        payment_gateway=gw,
                        is_active=True,
                        account_identifier=acct or None,
                        description=desc,
                        sort_order=sort,
                        commission_percentage=0,
                    ))
                logger.info("Content bootstrap: seeded default payment methods")

            await db.commit()
    except Exception as exc:
        logger.error("Content bootstrap failed — application will still start: %s", exc, exc_info=exc)
