"""Central demo image URLs for ABO Enterprise visual assets (Unsplash).

Admin-editable copies live in the database (settings, products, services, blogs).
Excludes brand logo / favicon per product requirements.
"""
from __future__ import annotations

import json

# Aspect-ratio presets
HERO = (1920, 1080)       # 16:9 — homepage & page banners
FEATURED_16_9 = (1920, 1080)
PRODUCT_4_5 = (800, 1000)
OG = (1200, 630)
ICON_1_1 = (256, 256)
CARD_16_9 = (1280, 720)

# Stable Unsplash photo IDs — verified HTTP 200, context-matched
_PHOTOS: dict[str, str] = {
    "hero": "1556761175-5973dc0f32e7",
    "office": "1517248135467-4c7edcad34c4",
    "story": "1560472354-b33ff0c44a43",
    "about": "1522071820081-009f0129c71c",
    "products": "1511707171634-5f897ff02aa9",
    "services": "1454165804606-c3d57bc86b40",
    "blog": "1498050108023-c5249f4df085",
    "gallery": "1504384308090-c894fdcc538d",
    "career": "1522202176988-66273c2fd55f",
    "testimonials": "1521791136064-7986c2920216",
    "contact": "1558618666-fcd25c85cd64",
    "faq": "1553877522-43269d4ea984",
    "shipping": "1633356122544-f134324a6cee",
    "projects": "1460925895917-afdab827c52f",
    "track": "1542291026-7eec264c27ff",
    "book": "1554224155-6726b3ff858f",
    "compare": "1523275335684-37898b6baf30",
    "printing": "1618005182384-a83a8bd57fbe",
    "legal": "1554224155-6726b3ff858f",
    "software": "1498050108023-c5249f4df085",
    "cart": "1556742049-0cfed4f6a45d",
    "checkout": "1563013544-824ae1b704d3",
    "search": "1551288049-bebda4e38f71",
    "orders": "1542291026-7eec264c27ff",
    "privacy": "1560472354-b33ff0c44a43",
    "terms": "1454165804606-c3d57bc86b40",
    "refund": "1554224155-6726b3ff858f",
    "profile": "1507003211169-0a1dd7228f2d",
    "phone-case": "1523275335684-37898b6baf30",
    "charger": "1608043152269-423dbba4e7e1",
    "earbuds": "1618005182384-a83a8bd57fbe",
    "power-bank": "1633356122544-f134324a6cee",
    "glass": "1511707171634-5f897ff02aa9",
    "cable": "1542291026-7eec264c27ff",
    "car-holder": "1558618666-fcd25c85cd64",
    "speaker": "1608043152269-423dbba4e7e1",
    "printing-svc": "1618005182384-a83a8bd57fbe",
    "legal-svc": "1554224155-6726b3ff858f",
    "software-svc": "1498050108023-c5249f4df085",
    "web-design": "1547658719-da2b51169166",
    "mobile-app": "1504384308090-c894fdcc538d",
    "marketing": "1460925895917-afdab827c52f",
    "blog-welcome": "1498050108023-c5249f4df085",
    "blog-guide": "1511707171634-5f897ff02aa9",
    "pos-project": "1556742049-0cfed4f6a45d",
    "hms-project": "1560472354-b33ff0c44a43",
    "ecom-project": "1556742049-0cfed4f6a45d",
    "ui-shot": "1551288049-bebda4e38f71",
    "card-website": "1547658719-da2b51169166",
    "card-ai": "1677442136019-21780ecad995",
    "card-automation": "1498050108023-c5249f4df085",
    "card-erp": "1551288049-bebda4e38f71",
    "card-mobile": "1504384308090-c894fdcc538d",
    "card-devops": "1551288049-bebda4e38f71",
    "team-founder": "1560250097-0b93528c311a",
    "team-tech": "1573496359142-b8d87734a5a2",
    "team-support": "1472099645785-5658abf4ff4e",
    "client-retail": "1556742049-0cfed4f6a45d",
    "client-rest": "1517248135467-4c7edcad34c4",
    "client-school": "1522202176988-66273c2fd55f",
    "client-hospital": "1560472354-b33ff0c44a43",
    "client-isp": "1551288049-bebda4e38f71",
    "client-ecom": "1556742049-0cfed4f6a45d",
    "review-1": "1507003211169-0a1dd7228f2d",
    "review-2": "1494790108377-be9c29b29330",
    "review-3": "1500648767791-00dcc994a43e",
    "review-4": "1438761681033-6461ffad8d80",
}

_PRODUCT_PHOTO_KEYS: dict[str, str] = {
    "phone-case-premium": "phone-case",
    "fast-charger-65w": "charger",
    "earbuds-tws-pro": "earbuds",
    "power-bank-20000": "power-bank",
    "glass-protector": "glass",
    "type-c-cable-3m": "cable",
    "car-holder-magnetic": "car-holder",
    "bt-speaker-waterproof": "speaker",
}

_SERVICE_PHOTO_KEYS: dict[str, str] = {
    "printing": "printing-svc",
    "legal": "legal-svc",
    "software": "software-svc",
    "web-design": "web-design",
    "mobile-app": "mobile-app",
    "digital-marketing": "marketing",
}

_PROJECT_PHOTO_KEYS: dict[str, tuple[str, str, str]] = {
    "sylhet-retail-pos": ("pos-project", "ui-shot", "pos-project"),
    "clinic-hms": ("hms-project", "ui-shot", "hms-project"),
    "ecommerce-ai-chatbot": ("ecom-project", "ui-shot", "card-ai"),
}

_CARD_PHOTO_KEYS: dict[str, str] = {
    "website": "card-website",
    "ai": "card-ai",
    "automation": "card-automation",
    "erp": "card-erp",
    "mobile": "card-mobile",
    "devops": "card-devops",
}

_TEAM_PHOTO_KEYS: dict[str, str] = {
    "founding-team": "team-founder",
    "tech-team": "team-tech",
    "support-team": "team-support",
}

_CLIENT_PHOTO_KEYS: dict[str, str] = {
    "Retail POS": "client-retail",
    "Restaurant Pro": "client-rest",
    "School ERP": "client-school",
    "Hospital MS": "client-hospital",
    "ISP Billing": "client-isp",
    "E-Commerce": "client-ecom",
}

_REVIEW_PHOTO_KEYS: dict[str, str] = {
    "Rahim Uddin": "review-1",
    "Fatema Begum": "review-2",
    "Karim Hassan": "review-3",
    "Nusrat Jahan": "review-4",
}


def demo_img(key: str, w: int, h: int) -> str:
    pid = _PHOTOS.get(key, _PHOTOS["hero"])
    return f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w={w}&h={h}&q=80"


def hero_banner(text: str = "ABO Enterprise Sylhet") -> str:
    w, h = HERO
    return demo_img("hero", w, h)


def page_banner(page: str) -> str:
    w, h = HERO
    return demo_img(page if page in _PHOTOS else "services", w, h)


def review_avatar(name: str) -> str:
    w, h = ICON_1_1
    key = _REVIEW_PHOTO_KEYS.get(name, "review-1")
    return demo_img(key, w, h)


def team_photo(name: str) -> str:
    w, h = ICON_1_1
    for member in ABOUT_TEAM:
        if member["name"] == name:
            key = _TEAM_PHOTO_KEYS.get(member["id"], "team-founder")
            return demo_img(key, w, h)
    return demo_img("team-founder", w, h)


def client_logo(name: str) -> str:
    w, h = ICON_1_1
    key = _CLIENT_PHOTO_KEYS.get(name, "client-retail")
    return demo_img(key, w, h)


def product_image(name: str) -> str:
    w, h = PRODUCT_4_5
    slug_key = next((k for k, label in PRODUCT_IMAGE_MAP.items() if label == name), None)
    photo_key = _PRODUCT_PHOTO_KEYS.get(slug_key or "", "phone-case")
    return demo_img(photo_key, w, h)


def product_gallery(name: str, index: int) -> str:
    w, h = PRODUCT_4_5
    slug_key = next((k for k, label in PRODUCT_IMAGE_MAP.items() if label == name), None)
    base = _PRODUCT_PHOTO_KEYS.get(slug_key or "", "phone-case")
    alt = "cable" if index == 2 else base
    return demo_img(alt, w, h)


def og_image(name: str) -> str:
    w, h = OG
    return demo_img("hero", w, h)


def service_featured(name: str) -> str:
    w, h = FEATURED_16_9
    slug_key = next((k for k, (feat, _) in SERVICE_IMAGE_MAP.items() if feat == name), None)
    photo_key = _SERVICE_PHOTO_KEYS.get(slug_key or "", "software-svc")
    return demo_img(photo_key, w, h)


def service_icon(name: str) -> str:
    w, h = ICON_1_1
    slug_key = next((k for k, (_, icon) in SERVICE_IMAGE_MAP.items() if icon == name), None)
    photo_key = _SERVICE_PHOTO_KEYS.get(slug_key or "", "software-svc")
    return demo_img(photo_key, w, h)


def blog_featured(title: str) -> str:
    w, h = FEATURED_16_9
    key = "blog-welcome" if "Welcome" in title else "blog-guide"
    return demo_img(key, w, h)


def project_cover(title: str) -> str:
    w, h = FEATURED_16_9
    slug = next((p["slug"] for p in SHOWCASE_PROJECTS if p["title"]["en"] == title), None)
    if slug and slug in _PROJECT_PHOTO_KEYS:
        return demo_img(_PROJECT_PHOTO_KEYS[slug][0], w, h)
    return demo_img("projects", w, h)


def project_screenshot(title: str, index: int) -> str:
    w, h = FEATURED_16_9
    slug = next((p["slug"] for p in SHOWCASE_PROJECTS if p["title"]["en"] == title), None)
    if slug and slug in _PROJECT_PHOTO_KEYS:
        keys = _PROJECT_PHOTO_KEYS[slug]
        return demo_img(keys[min(index, len(keys) - 1)], w, h)
    return demo_img("ui-shot", w, h)


def software_card(title: str) -> str:
    w, h = CARD_16_9
    card_id = next((c["id"] for c in SOFTWARE_SERVICE_CARDS if c["title"]["en"] == title), "website")
    return demo_img(_CARD_PHOTO_KEYS.get(card_id, "card-website"), w, h)


def gallery_office() -> str:
    w, h = FEATURED_16_9
    return demo_img("office", w, h)


PAGE_BANNER_LABELS: dict[str, str] = {
    "about": "About ABO Enterprise",
    "products": "Mobile Accessories Shop",
    "services": "Professional Services",
    "blog": "Tech Tips and News",
    "gallery": "Project Gallery",
    "career": "Join Our Team",
    "testimonials": "Customer Reviews",
    "contact": "Contact ABO Sylhet",
    "faq": "Help Center FAQ",
    "shipping": "Delivery Information",
    "projects": "Custom Software Projects",
    "track": "Track Your Order",
    "book": "Book a Service",
    "compare": "Compare Products",
    "printing": "Printing Services",
    "legal": "Legal Assistance",
    "software": "Software and AI",
    "cart": "Shopping Cart",
    "checkout": "Secure Checkout",
    "search": "Search Products",
    "orders": "My Orders",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "refund": "Refund Policy",
    "profile": "My Profile",
}

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
    "welcome-abo-enterprise": "Welcome to ABO",
    "mobile-accessories-guide": "Accessories Guide",
}

REVIEW_PHOTO_MAP: dict[str, str] = {
    "Rahim Uddin": "Rahim Uddin",
    "Fatema Begum": "Fatema Begum",
    "Karim Hassan": "Karim Hassan",
    "Nusrat Jahan": "Nusrat Jahan",
}

ABOUT_TEAM: list[dict] = [
    {
        "id": "founding-team",
        "name": "Ahmed Brothers",
        "role": {"en": "Founding Team", "bn": "প্রতিষ্ঠাতা দল"},
        "desc": {"en": "Leading products, services & software strategy.", "bn": "পণ্য, সেবা ও সফটওয়্যার কৌশল পরিচালনা।"},
    },
    {
        "id": "tech-team",
        "name": "Tech Team",
        "role": {"en": "Software Engineers", "bn": "সফটওয়্যার ইঞ্জিনিয়ার"},
        "desc": {"en": "Web, mobile, AI & automation specialists.", "bn": "ওয়েব, মোবাইল, AI ও অটোমেশন বিশেষজ্ঞ।"},
    },
    {
        "id": "support-team",
        "name": "Support Team",
        "role": {"en": "Customer Success", "bn": "গ্রাহক সেবা"},
        "desc": {"en": "24/7 support via WhatsApp, phone & AI assistant.", "bn": "WhatsApp, ফোন ও AI সহকারীতে ২৪/৭ সেবা।"},
    },
]

CLIENT_LOGOS: list[dict] = [
    {"name": "Retail POS", "abbr": "RP"},
    {"name": "Restaurant Pro", "abbr": "REST"},
    {"name": "School ERP", "abbr": "ERP"},
    {"name": "Hospital MS", "abbr": "HMS"},
    {"name": "ISP Billing", "abbr": "ISP"},
    {"name": "E-Commerce", "abbr": "ECOM"},
]

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


def build_demo_reviews_json() -> str:
    reviews = [
        {
            "id": "demo-1",
            "customer_name": "Rahim Uddin",
            "company": "Shop Owner, Sylhet",
            "rating": 5,
            "review_en": "ABO built our POS in 2 weeks. Billing errors dropped to zero!",
            "review_bn": "ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!",
            "source": "Google",
            "is_verified": True,
            "is_featured": True,
        },
        {
            "id": "demo-2",
            "customer_name": "Fatema Begum",
            "company": "Restaurant Owner",
            "rating": 5,
            "review_en": "Restaurant software transformed our kitchen operations.",
            "review_bn": "রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।",
            "source": "Facebook",
            "is_verified": True,
            "is_featured": True,
        },
        {
            "id": "demo-3",
            "customer_name": "Karim Hassan",
            "company": "IT Manager",
            "rating": 5,
            "review_en": "Custom ERP delivered on time with AI features.",
            "review_bn": "AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।",
            "source": "Direct",
            "is_verified": False,
            "is_featured": True,
        },
        {
            "id": "demo-4",
            "customer_name": "Nusrat Jahan",
            "company": "Freelancer",
            "rating": 5,
            "review_en": "Top quality accessories, same-day delivery!",
            "review_bn": "সেরা মান, একই দিনে ডেলিভারি!",
            "source": "Google",
            "is_verified": True,
            "is_featured": True,
        },
    ]
    for r in reviews:
        r["photo_url"] = review_avatar(REVIEW_PHOTO_MAP.get(r["customer_name"], r["customer_name"]))
    return json.dumps(reviews, ensure_ascii=False)


def build_about_team_json() -> str:
    team = []
    for member in ABOUT_TEAM:
        entry = {**member}
        entry["image"] = team_photo(member["name"])
        team.append(entry)
    return json.dumps(team, ensure_ascii=False)


def build_client_logos_json() -> str:
    logos = []
    for client in CLIENT_LOGOS:
        logos.append({**client, "image": client_logo(client["name"])})
    return json.dumps(logos, ensure_ascii=False)


def banner_settings() -> list[dict]:
    rows = [
        {
            "key": "logo_url",
            "value": demo_img("office", 512, 512),
            "description": "Site logo (admin-editable)",
        },
        {
            "key": "favicon_url",
            "value": demo_img("office", 32, 32),
            "description": "Browser favicon (admin-editable)",
        },
        {
            "key": "app_icon_url",
            "value": demo_img("office", 512, 512),
            "description": "PWA / mobile app icon (admin-editable)",
        },
        {
            "key": "default_og_image_url",
            "value": demo_img("hero", 1200, 630),
            "description": "Default Open Graph / social share image",
        },
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
        {
            "key": "about_story_image_url",
            "value": demo_img("story", *FEATURED_16_9),
            "description": "About page story section image (1920×1080)",
        },
    ]
    for key in PAGE_BANNER_KEYS:
        rows.append({
            "key": f"banner_{key}_image_url",
            "value": page_banner(key),
            "description": f"Page banner for /{key} (1920×1080)",
        })
    return rows
