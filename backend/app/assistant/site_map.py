"""Deterministic site-map / navigation engine for the assistant.

This registry describes the application's OWN route architecture — pages,
their purpose, menu location, how-to steps and related pages. It contains
no business data (products, services, prices, FAQs, policies all continue
to come from the database via KnowledgeBase); routes are code, and this
table changes only when the frontend's routes change.

Used for:
  * NAVIGATION intent — "কোথায় লগইন করব", "how do I checkout"
  * page-context awareness — the widget sends the current path so the
    assistant knows which module the customer is standing in
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.assistant.nlp.fuzzy import fuzzy_score


@dataclass(frozen=True)
class SitePage:
    path: str
    title_en: str
    title_bn: str
    purpose_en: str
    purpose_bn: str
    menu_en: str  # where to find it in the UI
    menu_bn: str
    keywords: tuple[str, ...]  # EN + BN + banglish triggers
    steps_en: tuple[str, ...] = ()
    steps_bn: tuple[str, ...] = ()
    related: tuple[str, ...] = ()  # related paths


SITE_PAGES: tuple[SitePage, ...] = (
    SitePage(
        path="/products",
        title_en="Products", title_bn="পণ্য",
        purpose_en="Browse and buy mobile accessories, gadgets and electronics.",
        purpose_bn="মোবাইল এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স দেখুন ও কিনুন।",
        menu_en="Top menu → Products (or the Shop icon in the mobile bottom bar)",
        menu_bn="উপরের মেনু → পণ্য (মোবাইলে নিচের বারের শপ আইকন)",
        keywords=("shop", "buy", "kinbo", "kena", "দোকান", "কেনাকাটা"),
        related=("/cart", "/compare", "/search"),
    ),
    SitePage(
        path="/cart",
        title_en="Cart", title_bn="কার্ট",
        purpose_en="Review items you added before checkout.",
        purpose_bn="চেকআউটের আগে যোগ করা পণ্যগুলো দেখুন।",
        menu_en="Cart icon (top-right, or mobile bottom bar)",
        menu_bn="কার্ট আইকন (উপরে ডানে বা মোবাইলে নিচের বার)",
        keywords=("cart", "basket", "কার্ট", "ব্যাগ"),
        related=("/checkout", "/products"),
    ),
    SitePage(
        path="/checkout",
        title_en="Checkout", title_bn="চেকআউট",
        purpose_en="Place your order with delivery address and payment method.",
        purpose_bn="ডেলিভারি ঠিকানা ও পেমেন্ট দিয়ে অর্ডার সম্পন্ন করুন।",
        menu_en="Cart → Checkout button",
        menu_bn="কার্ট → চেকআউট বাটন",
        keywords=("checkout", "order dibo", "চেকআউট", "অর্ডার করব", "kinte chai"),
        steps_en=(
            "Add products to your cart from the Products page",
            "Open the cart and press Checkout",
            "Fill in name, phone (11-digit BD) and delivery address",
            "Pick district for delivery charge, apply coupon if any",
            "Choose payment (Cash on Delivery / bKash / Nagad) and confirm",
        ),
        steps_bn=(
            "পণ্য পেজ থেকে কার্টে পণ্য যোগ করুন",
            "কার্ট খুলে চেকআউট চাপুন",
            "নাম, ১১ ডিজিটের মোবাইল নম্বর ও ঠিকানা দিন",
            "জেলা বাছুন (ডেলিভারি চার্জ), কুপন থাকলে দিন",
            "পেমেন্ট বেছে নিন (ক্যাশ অন ডেলিভারি / বিকাশ / নগদ) ও কনফার্ম করুন",
        ),
        related=("/cart", "/track", "/shipping"),
    ),
    SitePage(
        path="/services",
        title_en="Services", title_bn="সেবা",
        purpose_en="All services — printing, legal writing, software, digital marketing.",
        purpose_bn="সব সেবা — প্রিন্টিং, আইনি লেখা, সফটওয়্যার, ডিজিটাল মার্কেটিং।",
        menu_en="Top menu → Services",
        menu_bn="উপরের মেনু → সেবা",
        keywords=("service", "সেবা", "সার্ভিস"),
        related=("/book", "/services/printing", "/services/legal", "/services/software"),
    ),
    SitePage(
        path="/book",
        title_en="Book a Service", title_bn="সেবা বুকিং",
        purpose_en="Book any service with your details; you get a booking number + invoice.",
        purpose_bn="যেকোনো সেবা বুক করুন; বুকিং নম্বর ও ইনভয়েস পাবেন।",
        menu_en="Services page → Book Now on any service",
        menu_bn="সেবা পেজ → যেকোনো সেবায় 'বুক করুন'",
        keywords=("book", "booking", "বুক", "বুকিং", "বুক করব"),
        steps_en=(
            "Open Services and pick a service",
            "Press Book Now",
            "Fill name, phone and requirement details",
            "Submit — you'll get a booking number (BK-…) and invoice",
        ),
        steps_bn=(
            "সেবা পেজ থেকে একটি সেবা বাছুন",
            "'বুক করুন' চাপুন",
            "নাম, ফোন ও প্রয়োজনের বিবরণ দিন",
            "সাবমিট করুন — বুকিং নম্বর (BK-…) ও ইনভয়েস পাবেন",
        ),
        related=("/services", "/track"),
    ),
    SitePage(
        path="/track",
        title_en="Track Order / Booking", title_bn="অর্ডার/বুকিং ট্র্যাক",
        purpose_en="Check order or booking status with your number.",
        purpose_bn="অর্ডার বা বুকিং নম্বর দিয়ে স্ট্যাটাস দেখুন।",
        menu_en="Top menu → Track (or mobile bottom bar → Track)",
        menu_bn="উপরের মেনু → ট্র্যাক (মোবাইলে নিচের বার → ট্র্যাক)",
        keywords=("track", "status", "ট্র্যাক", "স্ট্যাটাস", "kothay porjonto"),
        steps_en=("Open the Track page", "Enter your order (ABO-…) or booking (BK-…) number", "Press Track"),
        steps_bn=("ট্র্যাক পেজ খুলুন", "অর্ডার (ABO-…) বা বুকিং (BK-…) নম্বর দিন", "ট্র্যাক চাপুন"),
        related=("/orders", "/contact"),
    ),
    SitePage(
        path="/orders",
        title_en="My Orders", title_bn="আমার অর্ডার",
        purpose_en="See your order history after verifying your phone with OTP.",
        purpose_bn="OTP দিয়ে ফোন যাচাই করে আপনার অর্ডার হিস্টরি দেখুন।",
        menu_en="Profile → My Orders",
        menu_bn="প্রোফাইল → আমার অর্ডার",
        keywords=("my orders", "history", "আমার অর্ডার", "হিস্টরি", "amar order"),
        steps_en=("Open My Orders", "Enter your phone number", "Enter the OTP sent by SMS", "Your orders appear"),
        steps_bn=("আমার অর্ডার পেজ খুলুন", "ফোন নম্বর দিন", "SMS-এ পাওয়া OTP দিন", "আপনার অর্ডারগুলো দেখাবে"),
        related=("/track", "/profile"),
    ),
    SitePage(
        path="/contact",
        title_en="Contact", title_bn="যোগাযোগ",
        purpose_en="Send a message, call, or WhatsApp the team.",
        purpose_bn="মেসেজ পাঠান, কল করুন বা WhatsApp করুন।",
        menu_en="Top menu → Contact",
        menu_bn="উপরের মেনু → যোগাযোগ",
        keywords=("contact", "যোগাযোগ", "kotha bolte chai"),
        related=("/faq", "/about"),
    ),
    SitePage(
        path="/faq",
        title_en="FAQ", title_bn="সাধারণ প্রশ্ন",
        purpose_en="Answers to common questions — delivery, payment, warranty, returns.",
        purpose_bn="সাধারণ প্রশ্নের উত্তর — ডেলিভারি, পেমেন্ট, ওয়ারেন্টি, রিটার্ন।",
        menu_en="Footer → FAQ",
        menu_bn="ফুটার → FAQ",
        keywords=("faq", "প্রশ্ন", "জিজ্ঞাসা"),
        related=("/contact", "/shipping"),
    ),
    SitePage(
        path="/about",
        title_en="About Us", title_bn="আমাদের সম্পর্কে",
        purpose_en="Company story, mission and team.",
        purpose_bn="প্রতিষ্ঠানের গল্প, লক্ষ্য ও টিম।",
        menu_en="Top menu → About",
        menu_bn="উপরের মেনু → আমাদের সম্পর্কে",
        keywords=("about", "company", "আমাদের সম্পর্কে", "কোম্পানি"),
        related=("/contact", "/career", "/testimonials"),
    ),
    SitePage(
        path="/career",
        title_en="Careers", title_bn="ক্যারিয়ার",
        purpose_en="Open positions and the job application form.",
        purpose_bn="খোলা পদ ও চাকরির আবেদন ফর্ম।",
        menu_en="Footer → Careers",
        menu_bn="ফুটার → ক্যারিয়ার",
        keywords=("career", "job", "চাকরি", "ক্যারিয়ার", "chakri", "job korbo"),
        related=("/about", "/contact"),
    ),
    SitePage(
        path="/blog",
        title_en="Blog", title_bn="ব্লগ",
        purpose_en="Articles, tips and company news.",
        purpose_bn="আর্টিকেল, টিপস ও নিউজ।",
        menu_en="Top menu → Blog",
        menu_bn="উপরের মেনু → ব্লগ",
        keywords=("blog", "article", "ব্লগ", "নিউজ"),
        related=("/products", "/services"),
    ),
    SitePage(
        path="/gallery",
        title_en="Gallery", title_bn="গ্যালারি",
        purpose_en="Photos of work, office and events.",
        purpose_bn="কাজ, অফিস ও ইভেন্টের ছবি।",
        menu_en="Footer → Gallery",
        menu_bn="ফুটার → গ্যালারি",
        keywords=("gallery", "photo", "গ্যালারি", "ছবি"),
        related=("/about", "/projects"),
    ),
    SitePage(
        path="/testimonials",
        title_en="Reviews", title_bn="রিভিউ",
        purpose_en="Customer reviews — and submit your own.",
        purpose_bn="গ্রাহক রিভিউ — নিজের রিভিউও দিতে পারবেন।",
        menu_en="Footer → Testimonials",
        menu_bn="ফুটার → রিভিউ",
        keywords=("review", "testimonial", "রিভিউ", "মতামত"),
        related=("/products", "/services"),
    ),
    SitePage(
        path="/shipping",
        title_en="Shipping & Delivery", title_bn="শিপিং ও ডেলিভারি",
        purpose_en="Delivery zones, charges and timelines.",
        purpose_bn="ডেলিভারি এলাকা, চার্জ ও সময়।",
        menu_en="Footer → Shipping",
        menu_bn="ফুটার → শিপিং",
        keywords=("shipping", "শিপিং", "ডেলিভারি চার্জ কোথায়"),
        related=("/faq", "/checkout"),
    ),
    SitePage(
        path="/compare",
        title_en="Compare Products", title_bn="পণ্য তুলনা",
        purpose_en="Compare selected products side by side.",
        purpose_bn="বাছাই করা পণ্য পাশাপাশি তুলনা করুন।",
        menu_en="Products → compare icon on any product card",
        menu_bn="পণ্য কার্ডের তুলনা আইকন",
        keywords=("compare", "তুলনা", "tulona"),
        related=("/products",),
    ),
    SitePage(
        path="/search",
        title_en="Search", title_bn="সার্চ",
        purpose_en="Search products, services and blog posts.",
        purpose_bn="পণ্য, সেবা ও ব্লগ খুঁজুন।",
        menu_en="Search icon in the top bar",
        menu_bn="উপরের বারে সার্চ আইকন",
        keywords=("search", "khuji", "খুঁজব", "সার্চ"),
        related=("/products", "/services"),
    ),
    SitePage(
        path="/legal/privacy",
        title_en="Privacy Policy", title_bn="প্রাইভেসি পলিসি",
        purpose_en="How your data is collected and used.",
        purpose_bn="আপনার তথ্য কীভাবে ব্যবহৃত হয়।",
        menu_en="Footer → Privacy Policy",
        menu_bn="ফুটার → প্রাইভেসি পলিসি",
        keywords=("privacy", "প্রাইভেসি", "গোপনীয়তা"),
        related=("/legal/terms", "/legal/refund"),
    ),
    SitePage(
        path="/legal/terms",
        title_en="Terms & Conditions", title_bn="শর্তাবলি",
        purpose_en="Terms of using the website and services.",
        purpose_bn="ওয়েবসাইট ও সেবা ব্যবহারের শর্ত।",
        menu_en="Footer → Terms",
        menu_bn="ফুটার → শর্তাবলি",
        keywords=("terms", "শর্ত", "নিয়ম"),
        related=("/legal/privacy", "/legal/refund"),
    ),
    SitePage(
        path="/profile",
        title_en="My Account", title_bn="আমার অ্যাকাউন্ট",
        purpose_en="Your profile — orders, wishlist and settings (phone-OTP login).",
        purpose_bn="আপনার প্রোফাইল — অর্ডার, উইশলিস্ট ও সেটিংস (ফোন-OTP লগইন)।",
        menu_en="Profile icon in the top bar (or mobile bottom bar)",
        menu_bn="উপরের বারের প্রোফাইল আইকন (মোবাইলে নিচের বার)",
        keywords=("profile", "account", "login", "sign in", "প্রোফাইল", "অ্যাকাউন্ট", "লগইন", "লগ ইন"),
        steps_en=("Open My Account", "Enter your phone number", "Enter the SMS OTP", "You're in — orders & wishlist unlock"),
        steps_bn=("আমার অ্যাকাউন্ট খুলুন", "ফোন নম্বর দিন", "SMS-এ পাওয়া OTP দিন", "লগইন সম্পন্ন — অর্ডার ও উইশলিস্ট দেখুন"),
        related=("/orders", "/track"),
    ),
    SitePage(
        path="/legal/refund",
        title_en="Refund Policy", title_bn="রিফান্ড পলিসি",
        purpose_en="When and how refunds/returns work.",
        purpose_bn="রিফান্ড/রিটার্ন কখন ও কীভাবে হয়।",
        menu_en="Footer → Refund Policy",
        menu_bn="ফুটার → রিফান্ড পলিসি",
        keywords=("refund", "রিফান্ড", "টাকা ফেরত", "taka ferot", "return policy"),
        related=("/faq", "/contact"),
    ),
)

_BY_PATH = {p.path: p for p in SITE_PAGES}

# Module detection for dynamic paths (product/service detail pages etc.)
_DYNAMIC = (
    (re.compile(r"^/products/([\w-]+)$"), "product_detail"),
    (re.compile(r"^/services/([\w-]+)$"), "service_detail"),
    (re.compile(r"^/blog/([\w-]+)$"), "blog_post"),
)


def find_page(query: str, lang: str = "en") -> SitePage | None:
    """Best matching page for a navigation question — deterministic scoring."""
    q = query.lower().strip()
    if not q:
        return None
    best: tuple[float, SitePage] | None = None
    for page in SITE_PAGES:
        score = 0.0
        haystacks = (
            page.title_en.lower(), page.title_bn,
            *[k.lower() for k in page.keywords],
        )
        for h in haystacks:
            if not h:
                continue
            if re.search(rf"(?<!\w){re.escape(h)}(?!\w)", q):
                score = max(score, 1.0)
            elif re.search(r"[ঀ-৿]", h) and len(h) >= 3 and h in q:
                # Bengali inflections ("চাকরির", "লগইনে") defeat \w boundaries;
                # a controlled-keyword substring match is safe for Bangla script.
                score = max(score, 0.95)
            else:
                score = max(score, fuzzy_score(h, q) * 0.9)
        if score > 0.55 and (best is None or score > best[0]):
            best = (score, page)
    return best[1] if best else None


def page_for_path(path: str) -> tuple[SitePage | None, str, str | None]:
    """Resolve a URL path → (static page, module name, dynamic slug)."""
    if not path:
        return None, "", None
    clean = path.split("?")[0].rstrip("/") or "/"
    if clean in _BY_PATH:
        return _BY_PATH[clean], _BY_PATH[clean].path.strip("/") or "home", None
    for rx, module in _DYNAMIC:
        m = rx.match(clean)
        if m:
            return None, module, m.group(1)
    if clean == "/":
        return None, "home", None
    return None, clean.strip("/").split("/")[0], None


def related_pages(page: SitePage) -> list[SitePage]:
    return [_BY_PATH[p] for p in page.related if p in _BY_PATH]


def navigation_answer(page: SitePage, lang: str) -> str:
    """Compose a step-by-step navigation answer."""
    if lang == "bn":
        parts = [f"📍 {page.title_bn} — {page.purpose_bn}", f"যেভাবে যাবেন: {page.menu_bn}"]
        if page.steps_bn:
            parts.append("ধাপ:\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(page.steps_bn)))
    else:
        parts = [f"📍 {page.title_en} — {page.purpose_en}", f"Where: {page.menu_en}"]
        if page.steps_en:
            parts.append("Steps:\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(page.steps_en)))
    return "\n\n".join(parts)


def navigation_links(page: SitePage, lang: str) -> list[dict]:
    links = [{"label": page.title_en, "label_bn": page.title_bn, "url": page.path, "type": "page"}]
    for rel in related_pages(page)[:2]:
        links.append({"label": rel.title_en, "label_bn": rel.title_bn, "url": rel.path, "type": "related"})
    return links
