"""Central placeholder image URLs for ABO Enterprise visual assets (placehold.co).

Admin-editable copies live in the database (settings, products, services, blogs).
Excludes brand logo / favicon per product requirements.
"""
from __future__ import annotations

import json
from urllib.parse import quote

# Aspect-ratio presets
HERO = (1920, 1080)       # 16:9 — homepage & page banners
FEATURED_16_9 = (1920, 1080)
PRODUCT_4_5 = (800, 1000)
OG = (1200, 630)
ICON_1_1 = (256, 256)
CARD_16_9 = (1280, 720)


def ph(width: int, height: int, text: str, fmt: str = "webp") -> str:
    return f"https://placehold.co/{width}x{height}/{fmt}?text={quote(text)}"


def hero_banner(text: str = "Hero Banner") -> str:
    w, h = HERO
    return ph(w, h, text)


def page_banner(page: str) -> str:
    w, h = HERO
    label = page.replace("-", " ").title()
    return ph(w, h, f"{label} Banner")


def product_image(name: str) -> str:
    w, h = PRODUCT_4_5
    return ph(w, h, name)


def product_gallery(name: str, index: int) -> str:
    w, h = PRODUCT_4_5
    return ph(w, h, f"{name} {index}")


def og_image(name: str) -> str:
    w, h = OG
    return ph(w, h, f"{name} OG")


def service_featured(name: str) -> str:
    w, h = FEATURED_16_9
    return ph(w, h, name)


def service_icon(name: str) -> str:
    w, h = ICON_1_1
    return ph(w, h, name)


def blog_featured(title: str) -> str:
    w, h = FEATURED_16_9
    return ph(w, h, title)


def project_cover(title: str) -> str:
    w, h = FEATURED_16_9
    return ph(w, h, title)


def project_screenshot(title: str, index: int) -> str:
    w, h = FEATURED_16_9
    return ph(w, h, f"{title} {index}")


def software_card(title: str) -> str:
    w, h = CARD_16_9
    return ph(w, h, title)


def gallery_office() -> str:
    w, h = FEATURED_16_9
    return ph(w, h, "Office Gallery")


PAGE_BANNER_KEYS: tuple[str, ...] = (
    "about",
    "products",
    "services",
    "blog",
    "gallery",
    "career",
    "testimonials",
    "contact",
    "faq",
    "shipping",
    "projects",
    "track",
    "book",
    "compare",
    "printing",
    "legal",
    "software",
    "cart",
    "checkout",
    "search",
    "orders",
    "privacy",
    "terms",
    "refund",
    "profile",
)

PRODUCT_IMAGE_MAP: dict[str, str] = {
    "phone-case-premium": "Premium Phone Case",
    "fast-charger-65w": "Fast Charger 65W",
    "earbuds-tws-pro": "Earbuds TWS Pro",
    "power-bank-20000": "Power Bank 20000",
    "glass-protector": "Glass Protector",
    "type-c-cable-3m": "Type-C Cable 3M",
    "car-holder-magnetic": "Car Holder",
    "bt-speaker-waterproof": "BT Speaker",
}

SERVICE_IMAGE_MAP: dict[str, tuple[str, str]] = {
    "printing": ("Printing Services", "Printing"),
    "legal": ("Legal Assistance", "Legal"),
    "software": ("Software Development", "Software"),
    "web-design": ("Website Design", "Web Design"),
    "mobile-app": ("Mobile App", "Mobile App"),
    "digital-marketing": ("Digital Marketing", "Marketing"),
}

BLOG_IMAGE_MAP: dict[str, str] = {
    "welcome-abo-enterprise": "Welcome Blog",
    "mobile-accessories-guide": "Accessories Guide",
}

SHOWCASE_PROJECTS: list[dict] = [
    {
        "id": "sylhet-retail-pos",
        "slug": "sylhet-retail-pos",
        "title": {"en": "Retail POS System", "bn": "রিটেইল POS সিস্টেম"},
        "client": {"en": "Sylhet Retail Shop", "bn": "সিলেট রিটেইল শপ"},
        "category": {"en": "POS", "bn": "POS"},
        "technologies": ["React", "Node.js", "PostgreSQL", "Thermal Print"],
        "problem": {"en": "Manual billing caused errors and slow checkout.", "bn": "ম্যানুয়াল বিলিং-এ ভুল ও ধীর চেকআউট।"},
        "solution": {"en": "Custom POS with inventory sync and receipt printing.", "bn": "ইনভেন্টরি সিঙ্ক ও রসিদ প্রিন্ট সহ কাস্টম POS।"},
        "result": {"en": "50% faster billing, zero calculation errors.", "bn": "৫০% দ্রুত বিলিং, শূন্য হিসাব ভুল।"},
        "year": 2025,
        "sortOrder": 0,
        "featured": True,
    },
    {
        "id": "clinic-hms",
        "slug": "clinic-hms",
        "title": {"en": "Hospital Management System", "bn": "হাসপাতাল ম্যানেজমেন্ট সিস্টেম"},
        "client": {"en": "Local Clinic, Sylhet", "bn": "স্থানীয় ক্লিনিক, সিলেট"},
        "category": {"en": "Healthcare", "bn": "স্বাস্থ্য"},
        "technologies": ["Next.js", "FastAPI", "PostgreSQL"],
        "problem": {"en": "Paper records and delayed billing.", "bn": "কাগজের রেকর্ড ও বিলিং বিলম্ব।"},
        "solution": {"en": "Digital patient records and automated billing.", "bn": "ডিজিটাল রোগী রেকর্ড ও অটো বিলিং।"},
        "result": {"en": "100% digital records, 3x faster billing.", "bn": "১০০% ডিজিটাল রেকর্ড, ৩x দ্রুত বিলিং।"},
        "year": 2024,
        "sortOrder": 1,
        "featured": True,
    },
    {
        "id": "ecommerce-ai-chatbot",
        "slug": "ecommerce-ai-chatbot",
        "title": {"en": "E-Commerce + AI Chatbot", "bn": "ই-কমার্স + AI চ্যাটবট"},
        "client": {"en": "E-Commerce Brand", "bn": "ই-কমার্স ব্র্যান্ড"},
        "category": {"en": "Web + AI", "bn": "ওয়েব + AI"},
        "technologies": ["Next.js", "OpenAI API", "Vercel"],
        "problem": {"en": "No online presence, losing customers.", "bn": "অনলাইনে উপস্থিতি নেই, গ্রাহক হারানো।"},
        "solution": {"en": "Full storefront with 24/7 AI customer support.", "bn": "২৪/৭ AI সাপোর্ট সহ সম্পূর্ণ স্টোরফ্রন্ট।"},
        "result": {"en": "200% more leads in 3 months.", "bn": "৩ মাসে ২০০% বেশি লিড।"},
        "year": 2025,
        "sortOrder": 2,
        "featured": True,
    },
]

SOFTWARE_SERVICE_CARDS: list[dict] = [
    {
        "id": "website",
        "icon": "globe",
        "color": "from-green-500 to-teal-500",
        "title": {"en": "Website & Web App", "bn": "ওয়েবসাইট ও ওয়েব অ্যাপ"},
        "items": [
            {"en": "Business websites", "bn": "ব্যবসায়িক ওয়েবসাইট"},
            {"en": "E-commerce platforms", "bn": "ই-কমার্স প্ল্যাটফর্ম"},
            {"en": "Web applications", "bn": "ওয়েব অ্যাপ্লিকেশন"},
            {"en": "PWA development", "bn": "PWA ডেভেলপমেন্ট"},
        ],
    },
    {
        "id": "ai",
        "icon": "bot",
        "color": "from-orange-500 to-red-500",
        "title": {"en": "AI Solutions", "bn": "AI সমাধান"},
        "items": [
            {"en": "Custom AI agents", "bn": "কাস্টম AI এজেন্ট"},
            {"en": "OCR / Document processing", "bn": "OCR / ডকুমেন্ট প্রসেসিং"},
            {"en": "Chatbot integration", "bn": "চ্যাটবট ইন্টিগ্রেশন"},
            {"en": "Data extraction & analysis", "bn": "ডেটা এক্সট্রাকশন"},
        ],
    },
    {
        "id": "automation",
        "icon": "cog",
        "color": "from-indigo-500 to-purple-500",
        "title": {"en": "Python Automation", "bn": "পাইথন অটোমেশন"},
        "items": [
            {"en": "Business process automation", "bn": "ব্যবসায়িক প্রক্রিয়া স্বয়ংক্রিয়"},
            {"en": "Data scraping & processing", "bn": "ডেটা স্ক্র্যাপিং"},
            {"en": "API integrations", "bn": "API ইন্টিগ্রেশন"},
            {"en": "Scheduled task automation", "bn": "নির্ধারিত কাজ স্বয়ংক্রিয়"},
        ],
    },
    {
        "id": "erp",
        "icon": "database",
        "color": "from-cyan-500 to-blue-500",
        "title": {"en": "ERP / POS / CRM", "bn": "ERP / POS / CRM"},
        "items": [
            {"en": "Inventory management", "bn": "ইনভেন্টরি ম্যানেজমেন্ট"},
            {"en": "POS for retail & restaurant", "bn": "রিটেইল ও রেস্টুরেন্ট POS"},
            {"en": "ISP Billing system", "bn": "ISP বিলিং সিস্টেম"},
            {"en": "Hospital & school software", "bn": "হাসপাতাল ও স্কুল সফটওয়্যার"},
        ],
    },
    {
        "id": "mobile",
        "icon": "monitor",
        "color": "from-pink-500 to-rose-500",
        "title": {"en": "Mobile & Desktop Apps", "bn": "মোবাইল ও ডেস্কটপ অ্যাপ"},
        "items": [
            {"en": "Android & iOS apps", "bn": "Android ও iOS অ্যাপ"},
            {"en": "Cross-platform apps", "bn": "ক্রস-প্ল্যাটফর্ম অ্যাপ"},
            {"en": "Desktop software", "bn": "ডেস্কটপ সফটওয়্যার"},
            {"en": "API backend development", "bn": "API ব্যাকএন্ড"},
        ],
    },
    {
        "id": "devops",
        "icon": "code",
        "color": "from-violet-500 to-purple-500",
        "title": {"en": "DevOps & Cloud", "bn": "DevOps ও ক্লাউড"},
        "items": [
            {"en": "Docker & containerization", "bn": "Docker কন্টেইনারাইজেশন"},
            {"en": "Cloud deployment (AWS/GCP)", "bn": "ক্লাউড ডিপ্লয়মেন্ট"},
            {"en": "CI/CD pipeline setup", "bn": "CI/CD পাইপলাইন"},
            {"en": "Hosting & maintenance", "bn": "হোস্টিং ও মেইনটেন্যান্স"},
        ],
    },
]


def build_showcase_projects_json() -> str:
    projects = []
    for p in SHOWCASE_PROJECTS:
        title_en = p["title"]["en"]
        entry = {**p}
        entry["image"] = project_cover(title_en)
        entry["images"] = [
            project_screenshot(title_en, 1),
            project_screenshot(title_en, 2),
        ]
        projects.append(entry)
    return json.dumps(projects, ensure_ascii=False)


def build_software_service_cards_json() -> str:
    cards = []
    for card in SOFTWARE_SERVICE_CARDS:
        entry = {**card}
        entry["image"] = software_card(card["title"]["en"])
        cards.append(entry)
    return json.dumps(cards, ensure_ascii=False)


DEMO_PRODUCTS: list[dict] = [
    {"id": "demo-phone-case-premium", "slug": "phone-case-premium", "name_en": "Premium Phone Case", "name_bn": "প্রিমিয়াম ফোন কেস", "price": 299, "original_price": 500, "category": "accessories", "badge": "HOT", "stock_quantity": 50, "is_featured": True, "rating": 4.8, "review_count": 124},
    {"id": "demo-fast-charger-65w", "slug": "fast-charger-65w", "name_en": "Fast Charger 65W", "name_bn": "ফাস্ট চার্জার ৬৫W", "price": 599, "original_price": 800, "category": "accessories", "badge": "SALE", "stock_quantity": 30, "is_featured": True, "rating": 4.7, "review_count": 89},
    {"id": "demo-earbuds-tws-pro", "slug": "earbuds-tws-pro", "name_en": "Earbuds TWS Pro", "name_bn": "ওয়্যারলেস ইয়ারবাড প্রো", "price": 999, "original_price": 1500, "category": "gadgets", "badge": "NEW", "stock_quantity": 20, "is_featured": True, "rating": 4.9, "review_count": 203},
    {"id": "demo-power-bank-20000", "slug": "power-bank-20000", "name_en": "Power Bank 20000mAh", "name_bn": "পাওয়ার ব্যাংক ২০০০০mAh", "price": 1299, "category": "gadgets", "stock_quantity": 15, "is_featured": True, "rating": 4.6, "review_count": 67},
    {"id": "demo-glass-protector", "slug": "glass-protector", "name_en": "Tempered Glass Protector", "name_bn": "টেম্পার্ড গ্লাস প্রটেক্টর", "price": 250, "category": "accessories", "stock_quantity": 100, "rating": 4.5, "review_count": 312},
    {"id": "demo-type-c-cable-3m", "slug": "type-c-cable-3m", "name_en": "Type-C Cable 3M Braided", "name_bn": "টাইপ-সি ব্রেডেড ক্যাবল ৩M", "price": 199, "category": "accessories", "stock_quantity": 200, "rating": 4.4, "review_count": 156},
    {"id": "demo-car-holder-magnetic", "slug": "car-holder-magnetic", "name_en": "Magnetic Car Holder", "name_bn": "ম্যাগনেটিক কার হোল্ডার", "price": 399, "category": "accessories", "stock_quantity": 40, "rating": 4.3, "review_count": 45},
    {"id": "demo-bt-speaker-waterproof", "slug": "bt-speaker-waterproof", "name_en": "Waterproof BT Speaker", "name_bn": "ওয়াটারপ্রুফ স্পিকার", "price": 1499, "original_price": 2000, "category": "gadgets", "stock_quantity": 10, "rating": 4.7, "review_count": 78},
]

DEMO_SERVICES: list[dict] = [
    {"id": "demo-printing-services", "slug": "printing", "name_en": "Printing Services", "name_bn": "প্রিন্টিং সেবা", "short_description_en": "Business cards, banners, brochures & large format printing.", "short_description_bn": "বিজনেস কার্ড, ব্যানার, ব্রোশিওর ও লার্জ ফরম্যাট প্রিন্টিং।", "category": "printing", "pricing_type": "fixed", "base_price": 500, "is_featured": True, "icon_color": "#1e5ba8"},
    {"id": "demo-legal-assistance", "slug": "legal", "name_en": "Legal Assistance", "name_bn": "আইনি সহায়তা", "short_description_en": "Government documents, affidavits & legal filings.", "short_description_bn": "সরকারি ডকুমেন্ট, শপথপত্র ও আইনি কাজ।", "category": "legal", "pricing_type": "custom_quote", "min_price": 1000, "is_featured": True, "icon_color": "#f59e0b"},
    {"id": "demo-software-development", "slug": "software", "name_en": "Software Development", "name_bn": "সফটওয়্যার ডেভেলপমেন্ট", "short_description_en": "Custom web, mobile & enterprise software solutions.", "short_description_bn": "কাস্টম ওয়েব, মোবাইল ও এন্টারপ্রাইজ সফটওয়্যার সমাধান।", "category": "software", "pricing_type": "custom_quote", "min_price": 25000, "is_featured": True, "icon_color": "#16a34a"},
    {"id": "demo-web-design", "slug": "web-design", "name_en": "Website Design", "name_bn": "ওয়েবসাইট ডিজাইন", "short_description_en": "Modern responsive websites with SEO optimization.", "short_description_bn": "SEO অপ্টিমাইজড আধুনিক রেসপন্সিভ ওয়েবসাইট।", "category": "software", "pricing_type": "package", "base_price": 15000, "is_featured": False, "icon_color": "#7c3aed"},
    {"id": "demo-mobile-app", "slug": "mobile-app", "name_en": "Mobile App Development", "name_bn": "মোবাইল অ্যাপ ডেভেলপমেন্ট", "short_description_en": "Android & iOS apps for your business.", "short_description_bn": "আপনার ব্যবসার জন্য অ্যান্ড্রয়েড ও iOS অ্যাপ।", "category": "software", "pricing_type": "custom_quote", "min_price": 50000, "is_featured": False, "icon_color": "#0ea5e9"},
    {"id": "demo-digital-marketing", "slug": "digital-marketing", "name_en": "Digital Marketing", "name_bn": "ডিজিটাল মার্কেটিং", "short_description_en": "Social media, ads & brand growth strategies.", "short_description_bn": "সোশ্যাল মিডিয়া, বিজ্ঞাপন ও ব্র্যান্ড গ্রোথ স্ট্র্যাটেজি।", "category": "marketing", "pricing_type": "package", "base_price": 8000, "is_featured": False, "icon_color": "#ec4899"},
]


def build_demo_products_json() -> str:
    items = []
    for p in DEMO_PRODUCTS:
        label = PRODUCT_IMAGE_MAP.get(p["slug"], p["name_en"])
        items.append({**p, "image_url": product_image(label)})
    return json.dumps(items, ensure_ascii=False)


def build_demo_services_json() -> str:
    items = []
    for s in DEMO_SERVICES:
        featured_label, _ = SERVICE_IMAGE_MAP.get(s["slug"], (s["name_en"], s["name_en"]))
        items.append({**s, "featured_image_url": service_featured(featured_label)})
    return json.dumps(items, ensure_ascii=False)


def banner_settings() -> list[dict]:
    rows = [
        {
            "key": "hero_image_url",
            "value": hero_banner(),
            "description": "Homepage hero banner (1920×1080)",
        },
        {
            "key": "gallery_office_image_url",
            "value": gallery_office(),
            "description": "Gallery office tab image (1920×1080)",
        },
    ]
    for key in PAGE_BANNER_KEYS:
        rows.append({
            "key": f"banner_{key}_image_url",
            "value": page_banner(key),
            "description": f"Page banner for /{key} (1920×1080)",
        })
    return rows
