"""Full-catalog demo seeder — fills every taxonomy leaf with replaceable content.

Goal (per product owner request): every product leaf-category and every service
sub-category should ship with a few demo items + images, so no category page
looks empty before the admin enters real content. Everything created here is a
normal DB row (products / services / category images), so the admin can freely
edit or delete it from the panel.

Design notes
------------
* **Runs once.** A version marker in ``settings`` (``demo_catalog_seed_version``)
  gates the whole pass. Once it has run, deleting a demo item from the admin
  panel is permanent — a reboot never re-adds it. Bump ``SEED_VERSION`` only to
  ship a brand-new catalog.
* **Idempotent within a run.** Items are inserted only when their deterministic
  slug is missing, so a half-finished run (or a re-run after a version bump)
  never duplicates rows.
* **Never clobbers admin data.** Only the previous demo set (known seed slugs)
  is soft-deleted; category images are filled only when empty. Anything the
  admin created or edited is left untouched.
* **Images.** Reuses ONLY the verified Unsplash pool in ``placeholder_assets``
  (the backend can't reach Unsplash to validate new IDs, and broken images are
  worse than reused ones). Every generated item / category is tagged so a future
  bulk cleanup can find them (products/services carry ``"demo-seed"`` in tags).
"""
from __future__ import annotations

import json
import logging
import zlib

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.placeholder_assets import (
    CARD_16_9,
    FEATURED_16_9,
    ICON_1_1,
    OG,
    PRODUCT_4_5,
    demo_img,
)
from app.models.models import Category, Product, Service, Setting

logger = logging.getLogger(__name__)

# Bump to re-run the whole seed (e.g. to ship a new demo catalog). The stored
# value in settings is compared against this; equal → skip.
SEED_VERSION = "2026.07-full-catalog-v1"
SEED_VERSION_KEY = "demo_catalog_seed_version"
DEMO_TAG = "demo-seed"

# Previous sparse demo set (content_bootstrap PRODUCT_SEED / SERVICE_SEED). These
# are soft-deleted on the first full-catalog run so the site shows only the new,
# fully-categorised catalog. Real admin items never match these slugs.
OLD_DEMO_PRODUCT_SLUGS = [
    "phone-case-premium", "fast-charger-65w", "earbuds-tws-pro", "power-bank-20000",
    "glass-protector", "type-c-cable-3m", "car-holder-magnetic", "bt-speaker-waterproof",
]
OLD_DEMO_SERVICE_SLUGS = [
    "printing-service", "website-development", "mobile-app-development", "digital-marketing",
    "branding-design", "business-consultation", "custom-software", "ai-solutions",
    "python-automation", "legal-services", "nid-passport", "future-service",
]


# ── Product taxonomy tree ─────────────────────────────────────────────────────
# (top_slug, top_en, top_bn, top_photo, [ (branch_slug, branch_en, branch_bn,
#   branch_photo, [ (leaf_slug, leaf_en, leaf_bn), ... ]), ... ])
# Mirrors migrations/018_products_taxonomy_seed.sql. Embedded here so the seed is
# self-sufficient: the product tree is created if the manual SQL never ran, and
# each generated product is linked straight to its leaf category id.
PRODUCT_TAXONOMY: list = [
    ("mobile-accessories", "Mobile Accessories", "মোবাইল অ্যাক্সেসরিজ", "products", [
        ("chargers", "Chargers", "চার্জার", "charger", [
            ("mobile-chargers", "Mobile Charger", "মোবাইল চার্জার"),
            ("fast-chargers", "Fast Charger", "ফাস্ট চার্জার"),
            ("wireless-chargers", "Wireless Charger", "ওয়্যারলেস চার্জার"),
        ]),
        ("cables", "Cables", "কেবল", "cable", [
            ("type-c-cables", "Type-C Cable", "Type-C কেবল"),
            ("lightning-cables", "Lightning Cable", "Lightning কেবল"),
            ("micro-usb-cables", "Micro USB Cable", "Micro USB কেবল"),
        ]),
        ("power-banks", "Power Banks", "পাওয়ার ব্যাংক", "power-bank", [
            ("mini-power-banks", "Mini Power Bank", "মিনি পাওয়ার ব্যাংক"),
            ("fast-charging-power-banks", "Fast Charging Power Bank", "ফাস্ট চার্জিং পাওয়ার ব্যাংক"),
            ("wireless-power-banks", "Wireless Power Bank", "ওয়্যারলেস পাওয়ার ব্যাংক"),
        ]),
        ("headphones", "Headphones", "হেডফোন", "earbuds", [
            ("wired-headphones", "Wired Headphone", "তারযুক্ত হেডফোন"),
            ("wireless-headphones", "Wireless Headphone", "ওয়্যারলেস হেডফোন"),
            ("gaming-headphones", "Gaming Headphone", "গেমিং হেডফোন"),
        ]),
        ("earphones", "Earphones", "ইয়ারফোন", "speaker", [
            ("wired-earphones", "Wired Earphone", "তারযুক্ত ইয়ারফোন"),
            ("bluetooth-earphones", "Bluetooth Earphone", "ব্লুটুথ ইয়ারফোন"),
            ("neckbands", "Neckband", "নেকব্যান্ড"),
        ]),
        ("mobile-covers", "Mobile Covers", "মোবাইল কভার", "phone-case", [
            ("silicone-covers", "Silicone Cover", "সিলিকন কভার"),
            ("leather-covers", "Leather Cover", "লেদার কভার"),
            ("rugged-covers", "Rugged Cover", "রাগেড কভার"),
        ]),
        ("tempered-glass", "Tempered Glass", "টেম্পার্ড গ্লাস", "glass", [
            ("tempered-glass-25d", "2.5D Glass", "2.5D গ্লাস"),
            ("tempered-glass-5d", "5D Glass", "5D গ্লাস"),
            ("privacy-glass", "Privacy Glass", "প্রাইভেসি গ্লাস"),
        ]),
        ("memory-cards", "Memory Cards", "মেমোরি কার্ড", "products", [
            ("memory-32gb", "32GB Memory Card", "৩২ জিবি মেমোরি কার্ড"),
            ("memory-64gb", "64GB Memory Card", "৬৪ জিবি মেমোরি কার্ড"),
            ("memory-128gb", "128GB Memory Card", "১২৮ জিবি মেমোরি কার্ড"),
        ]),
        ("otg-adapters", "OTG / Adapters", "OTG / অ্যাডাপ্টার", "car-holder", [
            ("usb-otg", "USB OTG", "USB OTG"),
            ("type-c-otg", "Type-C OTG", "Type-C OTG"),
            ("multi-adapters", "Multi Adapter", "মাল্টি অ্যাডাপ্টার"),
        ]),
        ("gaming-accessories", "Gaming Accessories", "গেমিং অ্যাক্সেসরিজ", "card-mobile", [
            ("game-triggers", "Game Trigger", "গেম ট্রিগার"),
            ("cooling-fans", "Cooling Fan", "কুলিং ফ্যান"),
            ("finger-sleeves", "Finger Sleeve", "ফিঙ্গার স্লিভ"),
        ]),
    ]),
    ("premium-gadgets", "Premium Gadgets", "প্রিমিয়াম গ্যাজেট", "gallery", [
        ("smartwatches", "Smartwatches", "স্মার্টওয়াচ", "track", [
            ("android-smartwatches", "Android Smartwatch", "অ্যান্ড্রয়েড স্মার্টওয়াচ"),
            ("calling-smartwatches", "Calling Smartwatch", "কলিং স্মার্টওয়াচ"),
            ("fitness-smartwatches", "Fitness Smartwatch", "ফিটনেস স্মার্টওয়াচ"),
        ]),
        ("bluetooth-speakers", "Bluetooth Speakers", "ব্লুটুথ স্পিকার", "speaker", [
            ("portable-speakers", "Portable Speaker", "পোর্টেবল স্পিকার"),
            ("mini-speakers", "Mini Speaker", "মিনি স্পিকার"),
            ("party-speakers", "Party Speaker", "পার্টি স্পিকার"),
        ]),
        ("microphones", "Microphones", "মাইক্রোফোন", "book", [
            ("lavalier-microphones", "Lavalier Microphone", "লাভালিয়ার মাইক"),
            ("wireless-microphones", "Wireless Microphone", "ওয়্যারলেস মাইক"),
            ("usb-microphones", "USB Microphone", "USB মাইক"),
        ]),
        ("vr-ar", "VR / AR", "VR / AR", "card-ai", [
            ("vr-headsets", "VR Headset", "VR হেডসেট"),
            ("ar-glasses", "AR Glass", "AR গ্লাস"),
            ("vr-ar-accessories", "VR/AR Accessories", "VR/AR অ্যাক্সেসরিজ"),
        ]),
        ("keyboards", "Keyboards", "কীবোর্ড", "search", [
            ("mechanical-keyboards", "Mechanical Keyboard", "মেকানিক্যাল কীবোর্ড"),
            ("wireless-keyboards", "Wireless Keyboard", "ওয়্যারলেস কীবোর্ড"),
            ("rgb-keyboards", "RGB Keyboard", "RGB কীবোর্ড"),
        ]),
        ("mouse", "Mouse", "মাউস", "compare", [
            ("office-mouse", "Office Mouse", "অফিস মাউস"),
            ("gaming-mouse", "Gaming Mouse", "গেমিং মাউস"),
            ("wireless-mouse", "Wireless Mouse", "ওয়্যারলেস মাউস"),
        ]),
        ("webcams", "Webcams", "ওয়েবক্যাম", "checkout", [
            ("hd-webcams", "HD Webcam", "HD ওয়েবক্যাম"),
            ("full-hd-webcams", "Full HD Webcam", "Full HD ওয়েবক্যাম"),
            ("4k-webcams", "4K Webcam", "4K ওয়েবক্যাম"),
        ]),
        ("smart-rings", "Smart Rings", "স্মার্ট রিং", "card-devops", [
            ("health-rings", "Health Ring", "হেলথ রিং"),
            ("nfc-rings", "NFC Ring", "NFC রিং"),
            ("premium-rings", "Premium Ring", "প্রিমিয়াম রিং"),
        ]),
        ("streaming-gear", "Streaming Gear", "স্ট্রিমিং গিয়ার", "projects", [
            ("capture-cards", "Capture Card", "ক্যাপচার কার্ড"),
            ("studio-lights", "Studio Light", "স্টুডিও লাইট"),
            ("streaming-stands", "Streaming Stand", "স্ট্রিমিং স্ট্যান্ড"),
        ]),
        ("gaming-controllers", "Gaming Controllers", "গেমিং কন্ট্রোলার", "card-mobile", [
            ("android-controllers", "Android Controller", "অ্যান্ড্রয়েড কন্ট্রোলার"),
            ("pc-controllers", "PC Controller", "পিসি কন্ট্রোলার"),
            ("console-controllers", "Console Controller", "কনসোল কন্ট্রোলার"),
        ]),
    ]),
    ("electronics", "Electronics", "ইলেকট্রনিক্স", "office", [
        ("routers", "Routers", "রাউটার", "card-website", [
            ("wifi-routers", "Wi-Fi Router", "Wi-Fi রাউটার"),
            ("dual-band-routers", "Dual Band Router", "ডুয়াল ব্যান্ড রাউটার"),
            ("gaming-routers", "Gaming Router", "গেমিং রাউটার"),
        ]),
        ("monitors", "Monitors", "মনিটর", "web-design", [
            ("full-hd-monitors", "Full HD Monitor", "Full HD মনিটর"),
            ("ips-monitors", "IPS Monitor", "IPS মনিটর"),
            ("gaming-monitors", "Gaming Monitor", "গেমিং মনিটর"),
        ]),
        ("printers", "Printers", "প্রিন্টার", "printing", [
            ("inkjet-printers", "Inkjet Printer", "ইঙ্কজেট প্রিন্টার"),
            ("laser-printers", "Laser Printer", "লেজার প্রিন্টার"),
            ("thermal-printers", "Thermal Printer", "থার্মাল প্রিন্টার"),
        ]),
        ("scanners", "Scanners", "স্ক্যানার", "shipping", [
            ("flatbed-scanners", "Flatbed Scanner", "ফ্ল্যাটবেড স্ক্যানার"),
            ("portable-scanners", "Portable Scanner", "পোর্টেবল স্ক্যানার"),
            ("document-scanners", "Document Scanner", "ডকুমেন্ট স্ক্যানার"),
        ]),
        ("ups", "UPS", "UPS", "card-automation", [
            ("mini-ups", "Mini UPS", "মিনি UPS"),
            ("offline-ups", "Offline UPS", "অফলাইন UPS"),
            ("online-ups", "Online UPS", "অনলাইন UPS"),
        ]),
        ("ssd", "SSD", "SSD", "card-erp", [
            ("sata-ssd", "SATA SSD", "SATA SSD"),
            ("nvme-ssd", "NVMe SSD", "NVMe SSD"),
            ("external-ssd", "External SSD", "এক্সটার্নাল SSD"),
        ]),
        ("hdd", "HDD", "HDD", "card-erp", [
            ("internal-hdd", "Internal HDD", "ইন্টারনাল HDD"),
            ("external-hdd", "External HDD", "এক্সটার্নাল HDD"),
            ("nas-hdd", "NAS HDD", "NAS HDD"),
        ]),
        ("cctv", "CCTV", "CCTV", "card-devops", [
            ("ip-cameras", "IP Camera", "IP ক্যামেরা"),
            ("dvr", "DVR", "DVR"),
            ("nvr", "NVR", "NVR"),
        ]),
        ("projectors", "Projectors", "প্রজেক্টর", "gallery", [
            ("mini-projectors", "Mini Projector", "মিনি প্রজেক্টর"),
            ("smart-projectors", "Smart Projector", "স্মার্ট প্রজেক্টর"),
            ("business-projectors", "Business Projector", "বিজনেস প্রজেক্টর"),
        ]),
        ("extension-boards", "Extension Boards", "এক্সটেনশন বোর্ড", "office", [
            ("basic-extension-boards", "Basic Extension Board", "বেসিক এক্সটেনশন বোর্ড"),
            ("surge-protectors", "Surge Protection Board", "সার্জ প্রোটেকশন বোর্ড"),
            ("usb-power-strips", "USB Power Strip", "USB পাওয়ার স্ট্রিপ"),
        ]),
    ]),
]

# Price band (BDT) per top category → (low, high) for the base "Standard" variant.
TOP_PRICE_BAND: dict[str, tuple[int, int]] = {
    "mobile-accessories": (150, 1800),
    "premium-gadgets": (900, 6500),
    "electronics": (1600, 26000),
}

# Photo key per service top category (verified pool only).
SERVICE_CAT_PHOTO: dict[str, str] = {
    "digital-e-services": "faq",
    "printing-documentation": "printing",
    "web-software": "web-design",
    "mobile-lab": "mobile-app",
    "it-support": "office",
    "marketing-design": "marketing",
    "business-consultancy": "book",
    "ai-automation": "card-ai",
    "others": "services",
}

# Three demo variants per leaf. (slug, en, bn, price_multiplier)
PRODUCT_VARIANTS: list[tuple[str, str, str, float]] = [
    ("standard", "Standard", "স্ট্যান্ডার্ড", 1.0),
    ("pro", "Pro", "প্রো", 1.45),
    ("max", "Max", "ম্যাক্স", 1.9),
]

# Service tier variants. (slug, en, bn, pricing_type, price_multiplier)
SERVICE_VARIANTS: list[tuple[str, str, str, str, float]] = [
    ("basic", "Basic", "বেসিক", "fixed", 1.0),
    ("standard", "Standard", "স্ট্যান্ডার্ড", "package", 1.6),
    ("premium", "Premium", "প্রিমিয়াম", "custom_quote", 2.4),
]

# Base price (BDT) per service top category for the "Basic" tier.
SERVICE_BASE_PRICE: dict[str, int] = {
    "digital-e-services": 300,
    "printing-documentation": 200,
    "web-software": 12000,
    "mobile-lab": 500,
    "it-support": 800,
    "marketing-design": 5000,
    "business-consultancy": 6000,
    "ai-automation": 15000,
    "others": 1000,
}


def _crc(text: str) -> int:
    return zlib.crc32(text.encode("utf-8")) & 0xFFFFFFFF


def _price_for(top_slug: str, leaf_slug: str, multiplier: float) -> float:
    low, high = TOP_PRICE_BAND.get(top_slug, (200, 2000))
    span = max(high - low, 1)
    base = low + (_crc(leaf_slug) % span)
    value = round(base * multiplier / 10) * 10  # round to nearest 10
    return float(max(value - 1, 9))  # charm price ending in 9


# ── Content generators ────────────────────────────────────────────────────────
def _product_payload(top, branch, leaf, variant, seq: int) -> dict:
    top_slug, top_en, top_bn, top_photo = top
    branch_slug, branch_en, branch_bn, branch_photo = branch
    leaf_slug, leaf_en, leaf_bn = leaf
    var_slug, var_en, var_bn, mult = variant

    slug = f"{leaf_slug}-{var_slug}"
    name_en = f"{leaf_en} {var_en}"
    name_bn = f"{leaf_bn} {var_bn}"
    price = _price_for(top_slug, leaf_slug, mult)
    original_price = round(price * 1.25 / 10) * 10 + 9 if var_slug != "standard" else None
    rating = round(4.2 + (_crc(slug) % 8) / 10, 1)  # 4.2 – 4.9
    stock = 10 + (_crc(slug + "stock") % 90)

    desc_en = (
        f"{name_en} — genuine {branch_en.lower()} from ABO Enterprise, Sylhet. "
        f"The {var_en} edition of our {leaf_en.lower()} range balances quality, "
        f"durability and value for everyday use in Bangladesh. Backed by warranty "
        f"and fast nationwide delivery."
    )
    desc_bn = (
        f"{name_bn} — ABO Enterprise, সিলেট থেকে অরিজিনাল {branch_bn}। "
        f"আমাদের {leaf_bn} রেঞ্জের {var_bn} এডিশনে মান, স্থায়িত্ব ও দামের "
        f"চমৎকার ভারসাম্য। ওয়ারেন্টি ও দ্রুত সারাদেশে ডেলিভারি সহ।"
    )
    specifications = {
        "Brand": "ABO",
        "Category": top_en,
        "Type": f"{leaf_en} ({var_en})",
        "Warranty": "6 months" if var_slug == "standard" else "12 months",
        "Origin": "Imported",
    }
    # Sparse, deterministic badges/featured flags so the storefront doesn't look
    # like every item is on sale. ~1 in 6 products gets a badge; ~1 in 15 leaves
    # contributes a featured item.
    badge = None
    mark = _crc(slug + "badge") % 6
    if mark == 0 and original_price:
        badge = "SALE"
    elif mark == 1:
        badge = "HOT"
    elif mark == 2 and var_slug == "max":
        badge = "NEW"

    photo = branch_photo or top_photo
    return {
        "slug": slug,
        "name_en": name_en,
        "name_bn": name_bn,
        "description_en": desc_en,
        "description_bn": desc_bn,
        "price": price,
        "original_price": original_price,
        "category": top_slug,
        "sub_category": branch_slug,
        "badge": badge,
        "image_url": demo_img(photo, *PRODUCT_4_5),
        "images": [demo_img(photo, *PRODUCT_4_5), demo_img(top_photo, *PRODUCT_4_5)],
        "og_image": demo_img(photo, *OG),
        "stock_quantity": stock,
        "is_active": True,
        "is_featured": var_slug == "standard" and _crc(leaf_slug) % 15 == 0,
        "sort_order": seq,
        "specifications": specifications,
        "tags": [DEMO_TAG, top_slug, branch_slug, leaf_slug],
        "rating": rating,
        "warranty_info": "6 months warranty" if var_slug == "standard" else "12 months warranty",
        "delivery_info": "Delivery within 1-3 business days across Bangladesh.",
    }


def _service_payload(cat_slug, cat_en, cat_bn, sub_slug, sub_en, sub_bn, variant, seq: int) -> dict:
    var_slug, var_en, var_bn, pricing_type, mult = variant
    photo = SERVICE_CAT_PHOTO.get(cat_slug, "services")
    base = SERVICE_BASE_PRICE.get(cat_slug, 1000)
    price = round(base * mult / 10) * 10

    slug = f"{sub_slug}-{var_slug}"
    name_en = f"{sub_en} — {var_en}"
    name_bn = f"{sub_bn} — {var_bn}"
    short_en = f"Professional {sub_en.lower()} service ({var_en} package) from ABO Enterprise."
    short_bn = f"ABO Enterprise থেকে পেশাদার {sub_bn} সেবা ({var_bn} প্যাকেজ)।"
    long_en = (
        f"Our {var_en} {sub_en.lower()} service under {cat_en} covers everything from "
        f"consultation to delivery. ABO Enterprise handles the full process so you get "
        f"reliable results, transparent pricing and dedicated support in Sylhet and "
        f"across Bangladesh."
    )
    long_bn = (
        f"{cat_bn} এর আওতায় আমাদের {var_bn} {sub_bn} সেবায় পরামর্শ থেকে ডেলিভারি "
        f"পর্যন্ত সবকিছু অন্তর্ভুক্ত। ABO Enterprise পুরো প্রক্রিয়া সামলায় — নির্ভরযোগ্য "
        f"ফলাফল, স্বচ্ছ মূল্য ও সিলেট সহ সারাদেশে নিবেদিত সাপোর্ট।"
    )
    process_steps = [
        {"title_en": "Requirement", "title_bn": "প্রয়োজন",
         "desc_en": "Share your requirement and we assess the scope.",
         "desc_bn": "আপনার প্রয়োজন জানান, আমরা স্কোপ যাচাই করি।"},
        {"title_en": "Quotation", "title_bn": "কোটেশন",
         "desc_en": "Transparent quote and timeline before we begin.",
         "desc_bn": "শুরুর আগে স্বচ্ছ মূল্য ও সময়সীমা।"},
        {"title_en": "Delivery", "title_bn": "ডেলিভারি",
         "desc_en": "We deliver, review and provide after-sales support.",
         "desc_bn": "ডেলিভারি, রিভিউ ও বিক্রয়-পরবর্তী সাপোর্ট।"},
    ]
    benefits = [
        {"en": "Experienced local team", "bn": "অভিজ্ঞ স্থানীয় টিম"},
        {"en": "Transparent, fair pricing", "bn": "স্বচ্ছ ও ন্যায্য মূল্য"},
        {"en": "Fast turnaround & support", "bn": "দ্রুত সেবা ও সাপোর্ট"},
    ]
    faq = [
        {"q_en": f"How long does {sub_en.lower()} take?",
         "q_bn": f"{sub_bn} করতে কত সময় লাগে?",
         "a_en": "Timeline depends on scope; we confirm it with your quotation.",
         "a_bn": "সময় স্কোপের উপর নির্ভরশীল; কোটেশনের সাথে নিশ্চিত করা হয়।"},
        {"q_en": "Can I replace this demo service later?",
         "q_bn": "পরে কি এই ডেমো সেবা পরিবর্তন করা যাবে?",
         "a_en": "Yes — every service here is fully editable from the admin panel.",
         "a_bn": "হ্যাঁ — প্রতিটি সেবা এডমিন প্যানেল থেকে সম্পূর্ণ এডিটযোগ্য।"},
    ]
    return {
        "slug": slug,
        "name_en": name_en,
        "name_bn": name_bn,
        "short_description_en": short_en,
        "short_description_bn": short_bn,
        "long_description_en": long_en,
        "long_description_bn": long_bn,
        "category": cat_slug,
        "pricing_type": pricing_type,
        "base_price": price if pricing_type != "custom_quote" else None,
        "min_price": price if pricing_type == "custom_quote" else None,
        "featured_image_url": demo_img(photo, *FEATURED_16_9),
        "icon_url": demo_img(photo, *ICON_1_1),
        "og_image": demo_img(photo, *OG),
        "is_active": True,
        "is_featured": var_slug == "basic" and _crc(sub_slug) % 8 == 0,
        "sort_order": seq,
        "tags": [DEMO_TAG, cat_slug, sub_slug],
        "process_steps": process_steps,
        "benefits": benefits,
        "requirements": [
            {"en": "Basic project details", "bn": "প্রাথমিক প্রকল্পের তথ্য"},
            {"en": "Contact number for coordination", "bn": "সমন্বয়ের জন্য যোগাযোগ নম্বর"},
        ],
        "required_documents": [],
        "faq": faq,
    }


# ── Taxonomy & image helpers ──────────────────────────────────────────────────
async def _ensure_category(
    db: AsyncSession, by_slug: dict, slug: str, name_en: str, name_bn: str,
    photo: str, sort_order: int, parent_id, applies_to: list,
) -> Category:
    """Insert the category if missing; fill its image only when empty."""
    cat = by_slug.get(slug)
    image = demo_img(photo, *CARD_16_9)
    if cat is None:
        cat = Category(
            slug=slug, name_en=name_en, name_bn=name_bn, image_url=image,
            applies_to=applies_to, sort_order=sort_order, parent_id=parent_id,
            is_active=True,
        )
        db.add(cat)
        await db.flush()  # need cat.id for children
        by_slug[slug] = cat
    else:
        if not (cat.image_url or "").strip():
            cat.image_url = image
    return cat


async def _ensure_product_taxonomy(db: AsyncSession) -> list[tuple]:
    """Create the product tree (idempotent) and return the list of leaves.

    Returns [(top, branch, leaf_category_row), ...] for generation.
    """
    rows = (await db.execute(
        select(Category).where(Category.is_deleted == False)  # noqa: E712
    )).scalars().all()
    by_slug = {c.slug: c for c in rows}

    leaves: list[tuple] = []
    for t_i, (top_slug, top_en, top_bn, top_photo, branches) in enumerate(PRODUCT_TAXONOMY):
        top = await _ensure_category(
            db, by_slug, top_slug, top_en, top_bn, top_photo, t_i, None, ["product"]
        )
        for b_i, (br_slug, br_en, br_bn, br_photo, leaf_list) in enumerate(branches):
            branch = await _ensure_category(
                db, by_slug, br_slug, br_en, br_bn, br_photo, b_i, top.id, ["product"]
            )
            for l_i, (leaf_slug, leaf_en, leaf_bn) in enumerate(leaf_list):
                leaf = await _ensure_category(
                    db, by_slug, leaf_slug, leaf_en, leaf_bn, br_photo, l_i, branch.id, ["product"]
                )
                leaves.append((
                    (top_slug, top_en, top_bn, top_photo),
                    (br_slug, br_en, br_bn, br_photo),
                    (leaf_slug, leaf_en, leaf_bn),
                    leaf,
                ))
    return leaves


async def _service_leaves(db: AsyncSession) -> tuple[list[tuple], dict]:
    """Discover service (category, subcategory) pairs from the live tree.

    Service taxonomy is created by alembic 0006/0008, so it is read from the DB
    rather than re-declared. Also fills any missing category/subcategory image.
    Returns [(top_category_row, sub_category_row), ...].
    """
    rows = (await db.execute(
        select(Category).where(Category.is_deleted == False)  # noqa: E712
    )).scalars().all()
    by_id = {c.id: c for c in rows}

    def is_service(c: Category) -> bool:
        return "service" in (c.applies_to or [])

    tops = [c for c in rows if is_service(c) and c.parent_id is None]
    pairs: list[tuple] = []
    for top in tops:
        photo = SERVICE_CAT_PHOTO.get(top.slug, "services")
        if not (top.image_url or "").strip():
            top.image_url = demo_img(photo, *CARD_16_9)
        subs = [c for c in rows if c.parent_id == top.id]
        for sub in subs:
            if not (sub.image_url or "").strip():
                sub.image_url = demo_img(photo, *CARD_16_9)
            pairs.append((top, sub))
    return pairs, by_id


# ── Generation ────────────────────────────────────────────────────────────────
async def _existing_slugs(db: AsyncSession, model) -> set[str]:
    return set((await db.execute(select(model.slug))).scalars().all())


async def _generate_products(db: AsyncSession, leaves: list[tuple]) -> int:
    existing = await _existing_slugs(db, Product)
    created = 0
    for top, branch, leaf, leaf_cat in leaves:
        for seq, variant in enumerate(PRODUCT_VARIANTS):
            payload = _product_payload(top, branch, leaf, variant, seq)
            if payload["slug"] in existing:
                continue
            db.add(Product(category_id=leaf_cat.id, subcategory_id=leaf_cat.id, **payload))
            existing.add(payload["slug"])
            created += 1
    return created


async def _generate_services(db: AsyncSession, pairs: list[tuple]) -> int:
    existing = await _existing_slugs(db, Service)
    created = 0
    for top, sub in pairs:
        for seq, variant in enumerate(SERVICE_VARIANTS):
            payload = _service_payload(
                top.slug, top.name_en, top.name_bn or top.name_en,
                sub.slug, sub.name_en, sub.name_bn or sub.name_en, variant, seq,
            )
            if payload["slug"] in existing:
                continue
            db.add(Service(category_id=top.id, subcategory_id=sub.id, **payload))
            existing.add(payload["slug"])
            created += 1
    return created


async def _remove_old_demo(db: AsyncSession) -> None:
    """Soft-delete the previous sparse demo set so only the new catalog shows."""
    for slug in OLD_DEMO_PRODUCT_SLUGS:
        row = (await db.execute(
            select(Product).where(Product.slug == slug, Product.is_deleted == False)  # noqa: E712
        )).scalar_one_or_none()
        if row is not None:
            row.is_deleted = True
            row.is_active = False
    for slug in OLD_DEMO_SERVICE_SLUGS:
        row = (await db.execute(
            select(Service).where(Service.slug == slug, Service.is_deleted == False)  # noqa: E712
        )).scalar_one_or_none()
        if row is not None:
            row.is_deleted = True
            row.is_active = False


async def _seed_version(db: AsyncSession) -> Setting | None:
    return (await db.execute(
        select(Setting).where(Setting.key == SEED_VERSION_KEY, Setting.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()


async def seed_full_demo_catalog(db: AsyncSession) -> None:
    """Version-gated one-time seed of the full demo catalog.

    Safe to call on every boot: returns immediately once the current
    ``SEED_VERSION`` has been applied, so admin deletions are never reverted.
    The caller owns the transaction (commit happens in bootstrap_content).
    """
    marker = await _seed_version(db)
    if marker is not None and (marker.value or "") == SEED_VERSION:
        return

    logger.info("Full demo catalog: seeding version %s", SEED_VERSION)

    await _remove_old_demo(db)

    leaves = await _ensure_product_taxonomy(db)
    products_created = await _generate_products(db, leaves)

    pairs, _ = await _service_leaves(db)
    services_created = await _generate_services(db, pairs)

    if marker is None:
        db.add(Setting(
            key=SEED_VERSION_KEY, value=SEED_VERSION, data_type="string",
            description="Version marker for the full demo catalog seed (one-time).",
            is_editable=False,
        ))
    else:
        marker.value = SEED_VERSION

    logger.info(
        "Full demo catalog: %d product leaves, %d service subs → %d products, %d services created",
        len(leaves), len(pairs), products_created, services_created,
    )
