"""Rich bilingual demo content for the storefront — descriptions, specs,
pricing tiers, reviews and homepage section JSON.

Everything here lands in admin-editable rows (products, services, reviews,
service_pricing_tiers, blog_posts, settings), so real content can replace it
from the admin panel at any time. content_bootstrap only applies these values
to slots that are still empty — custom admin content is never overwritten.
"""
from __future__ import annotations

import json

# ---------------------------------------------------------------------------
# Products — keyed by seed slug (see content_bootstrap.PRODUCT_SEED)
# ---------------------------------------------------------------------------

PRODUCT_CONTENT: dict[str, dict] = {
    "phone-case-premium": {
        "description_en": (
            "Protect your phone in style with this premium shockproof case. "
            "Military-grade drop protection, raised bezels for camera and screen, "
            "and a slim anti-slip grip that feels great in hand. Precise cutouts "
            "keep every port and button fully accessible."
        ),
        "description_bn": (
            "প্রিমিয়াম শকপ্রুফ কেস দিয়ে আপনার ফোনকে স্টাইলের সাথে সুরক্ষিত রাখুন। "
            "মিলিটারি-গ্রেড ড্রপ প্রটেকশন, ক্যামেরা ও স্ক্রিনের জন্য উঁচু বেজেল এবং "
            "হাতে আরামদায়ক স্লিম অ্যান্টি-স্লিপ গ্রিপ। নিখুঁত কাটআউটে সব পোর্ট ও বাটন সহজে ব্যবহারযোগ্য।"
        ),
        "specifications": {
            "Material": "TPU + Polycarbonate",
            "Protection": "Military-grade drop tested (2m)",
            "Camera Guard": "1.2mm raised bezel",
            "Compatibility": "iPhone / Samsung / Xiaomi models",
            "Weight": "38g",
            "Color": "Matte Black",
        },
        "tags": ["case", "protection", "accessories"],
        "brand": "ABO Select",
        "warranty_info": "7-day replacement warranty for manufacturing defects.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.8,
    },
    "fast-charger-65w": {
        "description_en": (
            "Charge your phone from 0 to 60% in just 25 minutes with this 65W GaN "
            "fast charger. Supports PD 3.0 and QC 4.0 protocols, with built-in "
            "over-heat, over-current and short-circuit protection. Compact design, "
            "perfect for travel."
        ),
        "description_bn": (
            "৬৫W GaN ফাস্ট চার্জার দিয়ে মাত্র ২৫ মিনিটে ফোন ০ থেকে ৬০% চার্জ করুন। "
            "PD 3.0 ও QC 4.0 প্রটোকল সাপোর্ট, সাথে ওভার-হিট, ওভার-কারেন্ট ও শর্ট-সার্কিট "
            "প্রটেকশন বিল্ট-ইন। কমপ্যাক্ট ডিজাইন — ভ্রমণের জন্য পারফেক্ট।"
        ),
        "specifications": {
            "Output": "65W Max (PD 3.0 / QC 4.0)",
            "Ports": "1× USB-C, 1× USB-A",
            "Input": "AC 100-240V",
            "Technology": "GaN (Gallium Nitride)",
            "Safety": "Over-heat / over-current / short-circuit protection",
            "Warranty": "6 months",
        },
        "tags": ["charger", "fast-charging", "accessories"],
        "brand": "ABO Select",
        "warranty_info": "6-month official warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.7,
    },
    "earbuds-tws-pro": {
        "description_en": (
            "True wireless earbuds with crystal-clear sound, deep bass and smart "
            "touch controls. Bluetooth 5.3 for a stable connection, ENC noise "
            "cancellation for calls, and up to 30 hours of total playtime with "
            "the charging case."
        ),
        "description_bn": (
            "ক্রিস্টাল-ক্লিয়ার সাউন্ড, ডিপ বেজ ও স্মার্ট টাচ কন্ট্রোল সহ ট্রু ওয়্যারলেস ইয়ারবাড। "
            "স্থিতিশীল কানেকশনের জন্য Bluetooth 5.3, কলের জন্য ENC নয়েজ ক্যান্সেলেশন এবং "
            "চার্জিং কেস সহ মোট ৩০ ঘণ্টা পর্যন্ত প্লেটাইম।"
        ),
        "specifications": {
            "Bluetooth": "5.3",
            "Playtime": "6h (earbuds) + 24h (case)",
            "Noise Cancellation": "ENC for calls",
            "Driver": "13mm dynamic",
            "Charging": "USB-C, fast charge",
            "Water Resistance": "IPX4",
        },
        "tags": ["earbuds", "audio", "gadgets"],
        "brand": "ABO Select",
        "warranty_info": "6-month service warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.9,
    },
    "power-bank-20000": {
        "description_en": (
            "Never run out of charge with this 20000mAh high-capacity power bank. "
            "22.5W fast charging, dual USB output plus USB-C in/out, LED battery "
            "display and airline-safe capacity. Charges a phone 4-5 times on a "
            "single fill."
        ),
        "description_bn": (
            "২০০০০mAh হাই-ক্যাপাসিটি পাওয়ার ব্যাংক — চার্জ ফুরানোর চিন্তা শেষ। "
            "২২.৫W ফাস্ট চার্জিং, ডুয়াল USB আউটপুট + USB-C ইন/আউট, LED ব্যাটারি ডিসপ্লে। "
            "এক চার্জে ফোন ৪-৫ বার ফুল চার্জ করা যায়।"
        ),
        "specifications": {
            "Capacity": "20000mAh",
            "Output": "22.5W Max",
            "Ports": "2× USB-A, 1× USB-C (in/out)",
            "Display": "LED battery indicator",
            "Recharge Time": "~6 hours (18W input)",
            "Weight": "420g",
        },
        "tags": ["power-bank", "battery", "gadgets"],
        "brand": "ABO Select",
        "warranty_info": "6-month official warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.6,
    },
    "glass-protector": {
        "description_en": (
            "9H hardness tempered glass protector with oleophobic coating — "
            "scratch-proof, fingerprint-resistant and 99.9% transparent. Easy "
            "bubble-free installation with the included alignment kit."
        ),
        "description_bn": (
            "৯H হার্ডনেস টেম্পার্ড গ্লাস প্রটেক্টর, অলিওফোবিক কোটিং সহ — স্ক্র্যাচপ্রুফ, "
            "ফিঙ্গারপ্রিন্ট-রেজিস্ট্যান্ট ও ৯৯.৯% স্বচ্ছ। অ্যালাইনমেন্ট কিট দিয়ে বাবল-ফ্রি সহজ ইনস্টলেশন।"
        ),
        "specifications": {
            "Hardness": "9H",
            "Thickness": "0.33mm",
            "Coating": "Oleophobic (anti-fingerprint)",
            "Transparency": "99.9%",
            "Includes": "Cleaning kit + alignment frame",
        },
        "tags": ["screen-protector", "glass", "accessories"],
        "brand": "ABO Select",
        "warranty_info": "Free re-installation support at our Sylhet shop.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.5,
    },
    "type-c-cable-3m": {
        "description_en": (
            "Extra-long 3-meter braided Type-C cable built for durability — "
            "10,000+ bend lifespan, 3A fast charging and 480Mbps data transfer. "
            "Perfect length for using your phone while it charges."
        ),
        "description_bn": (
            "৩ মিটার লম্বা ব্রেডেড টাইপ-সি ক্যাবল — ১০,০০০+ বেন্ড লাইফস্প্যান, "
            "৩A ফাস্ট চার্জিং ও 480Mbps ডাটা ট্রান্সফার। চার্জে রেখে ফোন চালানোর জন্য পারফেক্ট দৈর্ঘ্য।"
        ),
        "specifications": {
            "Length": "3 meters",
            "Current": "3A fast charging",
            "Data Transfer": "480Mbps",
            "Material": "Nylon braided, aluminum connectors",
            "Durability": "10,000+ bend tested",
        },
        "tags": ["cable", "type-c", "accessories"],
        "brand": "ABO Select",
        "warranty_info": "3-month replacement warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.4,
    },
    "car-holder-magnetic": {
        "description_en": (
            "Strong N52 magnetic car holder with 360° rotation — mounts your "
            "phone securely on any dashboard or air vent. One-hand operation, "
            "no shaking on rough roads, fits all phone sizes."
        ),
        "description_bn": (
            "শক্তিশালী N52 ম্যাগনেটিক কার হোল্ডার, ৩৬০° রোটেশন সহ — ড্যাশবোর্ড বা এয়ার ভেন্টে "
            "ফোন নিরাপদে আটকে রাখে। এক হাতে ব্যবহারযোগ্য, ঝাঁকুনিতেও নড়ে না, সব সাইজের ফোনে ফিট।"
        ),
        "specifications": {
            "Magnet": "N52 neodymium (×6)",
            "Rotation": "360°",
            "Mount": "Dashboard / air vent",
            "Compatibility": "All smartphones",
            "Includes": "2 metal plates + protective films",
        },
        "tags": ["car-holder", "mount", "accessories"],
        "brand": "ABO Select",
        "warranty_info": "3-month replacement warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.3,
    },
    "bt-speaker-waterproof": {
        "description_en": (
            "IPX7 waterproof Bluetooth speaker with punchy 10W stereo sound and "
            "deep bass radiator. 12-hour battery, TWS pairing for true stereo, "
            "and a rugged shell that survives pool-side splashes and outdoor trips."
        ),
        "description_bn": (
            "IPX7 ওয়াটারপ্রুফ ব্লুটুথ স্পিকার — ১০W স্টেরিও সাউন্ড ও ডিপ বেজ রেডিয়েটর। "
            "১২ ঘণ্টা ব্যাটারি, ট্রু স্টেরিওর জন্য TWS পেয়ারিং এবং মজবুত বডি — "
            "পানির ছিটা ও আউটডোর ট্রিপে নিশ্চিন্ত।"
        ),
        "specifications": {
            "Output": "10W stereo",
            "Waterproof": "IPX7",
            "Battery": "12 hours playtime",
            "Bluetooth": "5.0 with TWS pairing",
            "Extras": "Micro-SD slot, AUX input, mic for calls",
        },
        "tags": ["speaker", "bluetooth", "gadgets"],
        "brand": "ABO Select",
        "warranty_info": "6-month official warranty.",
        "delivery_info": "Same-day delivery in Sylhet city, 2-3 days nationwide.",
        "rating": 4.7,
    },
}

# ---------------------------------------------------------------------------
# Services — keyed by seed slug (see content_bootstrap.SERVICE_SEED)
# description_* feeds the public "About This Service" section;
# process_steps/benefits/requirements/faq match the admin editor shapes.
# ---------------------------------------------------------------------------

SERVICE_CONTENT: dict[str, dict] = {
    "printing-service": {
        "description_en": (
            "Professional printing for your business and personal needs — business cards, "
            "banners, brochures, flyers, invitation cards and large-format prints. "
            "We use high-resolution digital presses with premium paper stocks, and most "
            "jobs are ready the same day.\n\n"
            "Bring your own design or let our designers prepare one for you. "
            "Bulk orders get special pricing."
        ),
        "description_bn": (
            "আপনার ব্যবসা ও ব্যক্তিগত প্রয়োজনে পেশাদার প্রিন্টিং — বিজনেস কার্ড, ব্যানার, ব্রোশিওর, "
            "লিফলেট, দাওয়াত কার্ড ও লার্জ-ফরম্যাট প্রিন্ট। হাই-রেজোলিউশন ডিজিটাল প্রেস ও প্রিমিয়াম "
            "কাগজে কাজ হয়, বেশিরভাগ কাজ একই দিনে ডেলিভারি।\n\n"
            "নিজের ডিজাইন আনুন অথবা আমাদের ডিজাইনার দিয়ে বানিয়ে নিন। বাল্ক অর্ডারে বিশেষ মূল্য।"
        ),
        "process_steps": [
            {"step": 1, "title": "Share your design", "description": "Send your file or brief via WhatsApp or visit our shop"},
            {"step": 2, "title": "Approve the proof", "description": "We share a digital proof for your confirmation"},
            {"step": 3, "title": "Print & finish", "description": "High-resolution printing with cutting/lamination"},
            {"step": 4, "title": "Pickup or delivery", "description": "Same-day pickup or home delivery in Sylhet"},
        ],
        "benefits": [
            "Same-day printing for most jobs",
            "Premium paper and finishing options",
            "In-house design support",
            "Bulk order discounts",
        ],
        "requirements": ["Design file (PDF/AI/PNG) or a clear brief", "Quantity and size details"],
        "faq": [
            {"question": "How fast can you print business cards?", "answer": "Standard business cards are usually ready within 3-4 hours."},
            {"question": "Do you provide design services?", "answer": "Yes, our in-house designers can create your design for a small fee."},
        ],
        "tags": ["printing", "business-cards", "banner"],
    },
    "website-development": {
        "description_en": (
            "Get a modern, fast and mobile-friendly website that actually grows your "
            "business. We build everything from single-page business sites to full "
            "e-commerce platforms — SEO-optimized, secure, and easy to manage yourself.\n\n"
            "Every project includes responsive design, Google indexing setup, "
            "3 months of free support and training so your team can update content."
        ),
        "description_bn": (
            "আধুনিক, দ্রুত ও মোবাইল-ফ্রেন্ডলি ওয়েবসাইট নিন যা সত্যিই আপনার ব্যবসা বাড়াবে। "
            "সিঙ্গেল-পেজ বিজনেস সাইট থেকে সম্পূর্ণ ই-কমার্স প্ল্যাটফর্ম — SEO-অপ্টিমাইজড, নিরাপদ "
            "এবং নিজেই ম্যানেজ করার মতো সহজ।\n\n"
            "প্রতিটি প্রজেক্টে থাকছে রেসপন্সিভ ডিজাইন, Google ইনডেক্সিং সেটআপ, ৩ মাস ফ্রি সাপোর্ট "
            "এবং কনটেন্ট আপডেটের ট্রেনিং।"
        ),
        "process_steps": [
            {"step": 1, "title": "Discovery call", "description": "We understand your business, goals and budget"},
            {"step": 2, "title": "Design & approve", "description": "You review the design mockup before we build"},
            {"step": 3, "title": "Development", "description": "We build, test and load your content"},
            {"step": 4, "title": "Launch & training", "description": "Go live with domain, hosting and admin training"},
        ],
        "benefits": [
            "Mobile-first responsive design",
            "SEO setup with Google indexing",
            "3 months free support",
            "Admin panel training included",
        ],
        "requirements": ["Business details and logo", "Content (text/photos) or content-writing add-on"],
        "faq": [
            {"question": "How long does a website take?", "answer": "A standard business website takes 7-14 days; e-commerce takes 3-4 weeks."},
            {"question": "Do I own the website?", "answer": "Yes — domain, hosting and source code are handed over to you completely."},
        ],
        "tags": ["website", "web-development", "ecommerce"],
    },
    "mobile-app-development": {
        "description_en": (
            "Android and iOS apps built for Bangladesh's market — from business apps and "
            "e-commerce to delivery and booking platforms. We handle design, development, "
            "Play Store / App Store publishing and post-launch maintenance.\n\n"
            "Cross-platform technology keeps costs down while delivering a native-quality "
            "experience on both platforms."
        ),
        "description_bn": (
            "বাংলাদেশের মার্কেটের জন্য Android ও iOS অ্যাপ — বিজনেস অ্যাপ, ই-কমার্স থেকে ডেলিভারি "
            "ও বুকিং প্ল্যাটফর্ম। ডিজাইন, ডেভেলপমেন্ট, Play Store / App Store পাবলিশিং ও "
            "রক্ষণাবেক্ষণ — সবই আমরা করি।\n\n"
            "ক্রস-প্ল্যাটফর্ম প্রযুক্তিতে খরচ কম, কিন্তু দুই প্ল্যাটফর্মেই নেটিভ-মানের অভিজ্ঞতা।"
        ),
        "process_steps": [
            {"step": 1, "title": "Requirement analysis", "description": "Feature list, user flows and cost estimate"},
            {"step": 2, "title": "UI/UX design", "description": "Interactive prototype for your approval"},
            {"step": 3, "title": "Development & testing", "description": "Weekly progress builds you can try"},
            {"step": 4, "title": "Store publishing", "description": "Play Store / App Store launch + maintenance"},
        ],
        "benefits": [
            "One codebase for Android + iOS",
            "Store publishing handled for you",
            "Weekly progress demos",
            "Post-launch support plans",
        ],
        "requirements": ["App idea or feature list", "Reference apps you like (optional)"],
        "faq": [
            {"question": "What does an app cost?", "answer": "Simple apps start around ৳50,000; we quote after understanding your requirements."},
        ],
        "tags": ["mobile-app", "android", "ios"],
    },
    "digital-marketing": {
        "description_en": (
            "Grow your brand with data-driven digital marketing — Facebook and Google ads, "
            "social media management, content design and campaign strategy. We focus on "
            "measurable results: leads, sales and follower growth you can track monthly.\n\n"
            "Packages include creative design, ad budget management and a monthly "
            "performance report."
        ),
        "description_bn": (
            "ডাটা-ভিত্তিক ডিজিটাল মার্কেটিং দিয়ে ব্র্যান্ড বাড়ান — Facebook ও Google বিজ্ঞাপন, "
            "সোশ্যাল মিডিয়া ম্যানেজমেন্ট, কনটেন্ট ডিজাইন ও ক্যাম্পেইন স্ট্র্যাটেজি। আমরা পরিমাপযোগ্য "
            "ফলাফলে ফোকাস করি: লিড, সেল ও ফলোয়ার গ্রোথ — প্রতি মাসে ট্র্যাক করা যায়।\n\n"
            "প্যাকেজে থাকছে ক্রিয়েটিভ ডিজাইন, অ্যাড বাজেট ম্যানেজমেন্ট ও মাসিক পারফরম্যান্স রিপোর্ট।"
        ),
        "process_steps": [
            {"step": 1, "title": "Audit & strategy", "description": "We analyze your page, competitors and audience"},
            {"step": 2, "title": "Content plan", "description": "Monthly content calendar with creative designs"},
            {"step": 3, "title": "Run campaigns", "description": "Targeted ads with continuous optimization"},
            {"step": 4, "title": "Monthly report", "description": "Clear numbers: reach, leads, sales"},
        ],
        "benefits": [
            "Dedicated content designer",
            "Targeted ad campaigns",
            "Monthly performance reports",
            "Bangla + English content",
        ],
        "requirements": ["Facebook page admin access", "Monthly ad budget decision"],
        "faq": [
            {"question": "What's the minimum package?", "answer": "Social media management starts at ৳8,000/month plus your ad budget."},
        ],
        "tags": ["marketing", "facebook-ads", "social-media"],
    },
    "branding-design": {
        "description_en": (
            "Complete brand identity design — logo, business cards, letterheads, social "
            "media kits and brand guidelines. We craft a consistent, professional look "
            "that makes your business memorable both online and in print.\n\n"
            "Every package includes multiple concepts, unlimited minor revisions and "
            "print-ready + web-ready files."
        ),
        "description_bn": (
            "সম্পূর্ণ ব্র্যান্ড আইডেন্টিটি ডিজাইন — লোগো, বিজনেস কার্ড, লেটারহেড, সোশ্যাল মিডিয়া কিট "
            "ও ব্র্যান্ড গাইডলাইন। অনলাইন ও প্রিন্ট — দুই জায়গাতেই আপনার ব্যবসাকে স্মরণীয় করে তুলতে "
            "সামঞ্জস্যপূর্ণ, পেশাদার লুক তৈরি করি।\n\n"
            "প্রতিটি প্যাকেজে একাধিক কনসেপ্ট, আনলিমিটেড ছোট রিভিশন এবং প্রিন্ট-রেডি + ওয়েব-রেডি ফাইল।"
        ),
        "process_steps": [
            {"step": 1, "title": "Brand brief", "description": "Your business story, audience and style preferences"},
            {"step": 2, "title": "Concepts", "description": "2-3 logo concepts to choose from"},
            {"step": 3, "title": "Refinement", "description": "Revisions until you're happy"},
            {"step": 4, "title": "Final delivery", "description": "All formats: AI, PNG, PDF + guidelines"},
        ],
        "benefits": [
            "Multiple design concepts",
            "Unlimited minor revisions",
            "Print-ready & web-ready files",
            "Full ownership of the design",
        ],
        "requirements": ["Business name and tagline", "Style references (optional)"],
        "faq": [
            {"question": "How many revisions do I get?", "answer": "Unlimited minor revisions on your chosen concept."},
        ],
        "tags": ["branding", "logo", "design"],
    },
    "business-consultation": {
        "description_en": (
            "One-on-one consultation for digitalizing your business — which software you "
            "actually need, how to sell online, process automation opportunities and "
            "realistic budgets. Honest advice from a team that builds these systems daily.\n\n"
            "Sessions are available in person at our Sylhet office or over video call."
        ),
        "description_bn": (
            "আপনার ব্যবসা ডিজিটাল করার জন্য ওয়ান-টু-ওয়ান পরামর্শ — কোন সফটওয়্যার আসলেই দরকার, "
            "অনলাইনে কীভাবে বিক্রি করবেন, কোথায় অটোমেশন সম্ভব এবং বাস্তবসম্মত বাজেট। "
            "প্রতিদিন এসব সিস্টেম তৈরি করা টিমের কাছ থেকে সৎ পরামর্শ।\n\n"
            "সিলেট অফিসে সরাসরি অথবা ভিডিও কলে সেশন নেওয়া যায়।"
        ),
        "process_steps": [
            {"step": 1, "title": "Book a session", "description": "Choose in-person or video call"},
            {"step": 2, "title": "Discuss your business", "description": "Current challenges and goals"},
            {"step": 3, "title": "Get a roadmap", "description": "Written recommendations with budget estimates"},
        ],
        "benefits": [
            "Practical, vendor-neutral advice",
            "Written roadmap after each session",
            "In-person or online",
        ],
        "requirements": ["Brief description of your business"],
        "faq": [],
        "tags": ["consulting", "business", "digital"],
    },
    "custom-software": {
        "description_en": (
            "Custom software built around how YOUR business works — POS, inventory, ERP, "
            "CRM, school and hospital management, ISP billing and more. We design the "
            "system with you, build it in weekly sprints and support it after launch.\n\n"
            "All software comes with training, documentation and 3 months of free support."
        ),
        "description_bn": (
            "আপনার ব্যবসা যেভাবে চলে সেভাবেই কাস্টম সফটওয়্যার — POS, ইনভেন্টরি, ERP, CRM, "
            "স্কুল ও হাসপাতাল ম্যানেজমেন্ট, ISP বিলিং আরও অনেক কিছু। আপনার সাথে বসে সিস্টেম ডিজাইন, "
            "সাপ্তাহিক স্প্রিন্টে ডেভেলপমেন্ট এবং লঞ্চের পরে সাপোর্ট।\n\n"
            "সব সফটওয়্যারের সাথে ট্রেনিং, ডকুমেন্টেশন ও ৩ মাস ফ্রি সাপোর্ট।"
        ),
        "process_steps": [
            {"step": 1, "title": "Requirement workshop", "description": "We map your current workflow together"},
            {"step": 2, "title": "Proposal & timeline", "description": "Fixed scope, cost and delivery plan"},
            {"step": 3, "title": "Sprint development", "description": "Weekly demos — you see progress live"},
            {"step": 4, "title": "Deploy & train", "description": "Installation, staff training, go-live support"},
        ],
        "benefits": [
            "Built for your exact workflow",
            "Weekly progress demos",
            "Training + documentation included",
            "3 months free support",
        ],
        "requirements": ["Description of your current workflow", "Key features you need"],
        "faq": [
            {"question": "Can you modify my existing software?", "answer": "Often yes — we first audit the existing system, then advise whether to extend or rebuild."},
        ],
        "tags": ["software", "pos", "erp", "custom"],
    },
    "ai-solutions": {
        "description_en": (
            "Put AI to work in your business — customer-support chatbots, document OCR, "
            "automated data entry, sales analytics and custom AI agents. We integrate "
            "modern AI models with your existing systems, in Bangla and English.\n\n"
            "Start with a free feasibility discussion: we'll tell you honestly what AI "
            "can and cannot do for your case."
        ),
        "description_bn": (
            "আপনার ব্যবসায় AI কাজে লাগান — কাস্টমার-সাপোর্ট চ্যাটবট, ডকুমেন্ট OCR, স্বয়ংক্রিয় "
            "ডাটা এন্ট্রি, সেলস অ্যানালিটিক্স ও কাস্টম AI এজেন্ট। বাংলা ও ইংরেজিতে, আপনার বিদ্যমান "
            "সিস্টেমের সাথে আধুনিক AI মডেল ইন্টিগ্রেট করি।\n\n"
            "ফ্রি ফিজিবিলিটি আলোচনা দিয়ে শুরু করুন: আপনার ক্ষেত্রে AI কী পারবে আর কী পারবে না — সৎভাবে বলব।"
        ),
        "process_steps": [
            {"step": 1, "title": "Feasibility talk", "description": "Free discussion of your use case"},
            {"step": 2, "title": "Pilot build", "description": "Small working demo on your real data"},
            {"step": 3, "title": "Full integration", "description": "Production rollout with your systems"},
            {"step": 4, "title": "Monitor & improve", "description": "Accuracy tracking and tuning"},
        ],
        "benefits": [
            "Bangla + English AI support",
            "Works with your existing software",
            "Pilot-first, low-risk approach",
        ],
        "requirements": ["Description of the task to automate", "Sample data (if available)"],
        "faq": [
            {"question": "Do AI chatbots work in Bangla?", "answer": "Yes — our chatbots handle both Bangla and English customer queries naturally."},
        ],
        "tags": ["ai", "chatbot", "automation"],
    },
    "python-automation": {
        "description_en": (
            "Stop doing repetitive computer work by hand. We build Python automation for "
            "report generation, data scraping, Excel processing, email workflows, API "
            "integrations and scheduled tasks — saving your team hours every day."
        ),
        "description_bn": (
            "পুনরাবৃত্তিমূলক কম্পিউটারের কাজ হাতে করা বন্ধ করুন। রিপোর্ট তৈরি, ডাটা স্ক্র্যাপিং, "
            "Excel প্রসেসিং, ইমেইল ওয়ার্কফ্লো, API ইন্টিগ্রেশন ও শিডিউলড টাস্কের জন্য Python "
            "অটোমেশন তৈরি করি — প্রতিদিন আপনার টিমের ঘণ্টার পর ঘণ্টা বাঁচবে।"
        ),
        "process_steps": [
            {"step": 1, "title": "Show us the task", "description": "A screen recording of the manual process helps"},
            {"step": 2, "title": "Automation build", "description": "Script development with test runs"},
            {"step": 3, "title": "Handover", "description": "Scheduled execution + usage guide"},
        ],
        "benefits": ["Hours saved daily", "Fewer human errors", "Runs on schedule automatically"],
        "requirements": ["Description or recording of the manual task"],
        "faq": [],
        "tags": ["python", "automation", "scripting"],
    },
    "legal-services": {
        "description_en": (
            "Professional legal document drafting — affidavits, agreements, applications, "
            "notary paperwork and court document typing in proper legal format. "
            "Experienced staff, correct stamps and confidential handling."
        ),
        "description_bn": (
            "পেশাদার আইনি ডকুমেন্ট লেখা — হলফনামা, চুক্তিপত্র, আবেদন, নোটারি কাগজপত্র ও কোর্টের "
            "ডকুমেন্ট সঠিক আইনি ফরম্যাটে টাইপ। অভিজ্ঞ স্টাফ, সঠিক স্ট্যাম্প ও গোপনীয়তা রক্ষা।"
        ),
        "process_steps": [
            {"step": 1, "title": "Bring your documents", "description": "Visit our shop with related papers"},
            {"step": 2, "title": "Drafting", "description": "Proper legal format preparation"},
            {"step": 3, "title": "Review & delivery", "description": "You verify before final print"},
        ],
        "benefits": ["Correct legal formatting", "Confidential handling", "Same-day for most documents"],
        "requirements": ["Relevant existing documents", "NID copies of parties involved"],
        "required_documents": ["NID copy", "Existing related documents"],
        "faq": [],
        "tags": ["legal", "documents", "affidavit"],
    },
    "nid-passport": {
        "description_en": (
            "Complete support for government e-services — NID corrections and new "
            "applications, passport applications and renewals, birth registration and "
            "online form filling. We handle the online process correctly the first time, "
            "so you avoid repeated trips to government offices."
        ),
        "description_bn": (
            "সরকারি ই-সেবার সম্পূর্ণ সহায়তা — NID সংশোধন ও নতুন আবেদন, পাসপোর্ট আবেদন ও নবায়ন, "
            "জন্ম নিবন্ধন ও অনলাইন ফর্ম পূরণ। প্রথমবারেই অনলাইন প্রক্রিয়া সঠিকভাবে করি — "
            "সরকারি অফিসে বারবার যাওয়া থেকে বাঁচুন।"
        ),
        "process_steps": [
            {"step": 1, "title": "Bring documents", "description": "Required papers vary by service"},
            {"step": 2, "title": "Online application", "description": "We fill and submit correctly"},
            {"step": 3, "title": "Follow-up", "description": "Status tracking until completion"},
        ],
        "benefits": ["First-time-correct applications", "Status follow-up included", "All e-services in one place"],
        "requirements": ["Depends on the service — call us first"],
        "required_documents": ["NID / birth certificate", "Photos where applicable"],
        "faq": [
            {"question": "How long does NID correction take?", "answer": "Government processing typically takes 15-45 days; we track it for you."},
        ],
        "tags": ["nid", "passport", "e-services"],
    },
    "future-service": {
        "description_en": (
            "We keep adding new services based on what our customers need. "
            "Looking for something not listed? Tell us — chances are we can help "
            "or point you to someone trusted who can."
        ),
        "description_bn": (
            "গ্রাহকদের প্রয়োজন অনুযায়ী আমরা নিয়মিত নতুন সেবা যোগ করি। তালিকায় নেই এমন কিছু "
            "খুঁজছেন? আমাদের বলুন — সম্ভবত আমরা সাহায্য করতে পারব, নয়তো বিশ্বস্ত কাউকে দেখিয়ে দেব।"
        ),
        "process_steps": [],
        "benefits": [],
        "requirements": [],
        "faq": [],
        "tags": ["other"],
    },
}

# ---------------------------------------------------------------------------
# Service pricing tiers — seeded only when a service has no tiers yet.
# ---------------------------------------------------------------------------

SERVICE_TIER_SEED: dict[str, list[dict]] = {
    "website-development": [
        {
            "tier_name": "Starter",
            "description_en": "Single-page business website",
            "description_bn": "সিঙ্গেল-পেজ বিজনেস ওয়েবসাইট",
            "price": 15000,
            "duration_days": 7,
            "features": ["1 page, mobile-friendly", "Contact form + WhatsApp button", "Basic SEO setup", "1 year hosting included"],
            "sort_order": 1,
        },
        {
            "tier_name": "Business",
            "description_en": "Multi-page website with admin panel",
            "description_bn": "অ্যাডমিন প্যানেল সহ মাল্টি-পেজ ওয়েবসাইট",
            "price": 35000,
            "duration_days": 14,
            "features": ["Up to 8 pages", "Content admin panel", "Blog + gallery", "Google Maps & analytics", "3 months support"],
            "sort_order": 2,
        },
        {
            "tier_name": "E-Commerce",
            "description_en": "Full online store with payments",
            "description_bn": "পেমেন্ট সহ সম্পূর্ণ অনলাইন স্টোর",
            "price": 60000,
            "duration_days": 25,
            "features": ["Product catalog & cart", "bKash / Nagad / COD checkout", "Order management panel", "Delivery zone setup", "Training included"],
            "sort_order": 3,
        },
    ],
    "digital-marketing": [
        {
            "tier_name": "Basic",
            "description_en": "Social media management",
            "description_bn": "সোশ্যাল মিডিয়া ম্যানেজমেন্ট",
            "price": 8000,
            "duration_days": 30,
            "features": ["12 posts per month", "Creative design included", "Page optimization", "Monthly report"],
            "sort_order": 1,
        },
        {
            "tier_name": "Growth",
            "description_en": "Management + ad campaigns",
            "description_bn": "ম্যানেজমেন্ট + অ্যাড ক্যাম্পেইন",
            "price": 15000,
            "duration_days": 30,
            "features": ["20 posts per month", "2 ad campaigns managed", "Audience targeting", "Lead tracking", "Monthly strategy call"],
            "sort_order": 2,
        },
    ],
    "printing-service": [
        {
            "tier_name": "Business Cards",
            "description_en": "500 pcs, premium matte",
            "description_bn": "৫০০ পিস, প্রিমিয়াম ম্যাট",
            "price": 500,
            "duration_days": 1,
            "features": ["Double-sided color", "Premium 300gsm card", "Free basic design"],
            "sort_order": 1,
        },
        {
            "tier_name": "Banner / Festoon",
            "description_en": "Per square foot, PVC",
            "description_bn": "প্রতি বর্গফুট, PVC",
            "price": 40,
            "duration_days": 1,
            "features": ["High-resolution print", "Eyelets included", "Same-day ready"],
            "sort_order": 2,
        },
    ],
    "branding-design": [
        {
            "tier_name": "Logo Only",
            "description_en": "Professional logo design",
            "description_bn": "পেশাদার লোগো ডিজাইন",
            "price": 3000,
            "duration_days": 3,
            "features": ["3 concepts", "Unlimited minor revisions", "All file formats"],
            "sort_order": 1,
        },
        {
            "tier_name": "Brand Kit",
            "description_en": "Logo + full identity package",
            "description_bn": "লোগো + সম্পূর্ণ আইডেন্টিটি প্যাকেজ",
            "price": 8000,
            "duration_days": 7,
            "features": ["Logo + business card", "Letterhead & envelope", "Social media kit", "Brand guideline PDF"],
            "sort_order": 2,
        },
    ],
}

# ---------------------------------------------------------------------------
# Reviews — seeded only when the reviews table is completely empty.
# `product_slug: None` = general testimonial (shown on /testimonials);
# otherwise attached to that product's detail page too.
# ---------------------------------------------------------------------------

REVIEW_SEED: list[dict] = [
    {
        "product_slug": None,
        "customer_name": "Rahim Uddin",
        "company": "Shop Owner, Sylhet",
        "rating": 5,
        "review_en": "ABO built our POS in 2 weeks. Billing errors dropped to zero and my staff learned it in one day!",
        "review_bn": "ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্যে নেমেছে, স্টাফরা এক দিনেই শিখে গেছে!",
        "source": "google",
        "is_verified": True,
        "is_featured": True,
    },
    {
        "product_slug": None,
        "customer_name": "Fatema Begum",
        "company": "Restaurant Owner",
        "rating": 5,
        "review_en": "The restaurant software transformed our kitchen operations. Orders reach the kitchen instantly now.",
        "review_bn": "রেস্টুরেন্ট সফটওয়্যার আমাদের কিচেনের কাজ বদলে দিয়েছে। অর্ডার এখন সাথে সাথে কিচেনে পৌঁছায়।",
        "source": "facebook",
        "is_verified": True,
        "is_featured": True,
    },
    {
        "product_slug": None,
        "customer_name": "Karim Hassan",
        "company": "IT Manager",
        "rating": 5,
        "review_en": "Custom ERP delivered on time with AI reporting features. Professional team, clear communication.",
        "review_bn": "AI রিপোর্টিং সহ কাস্টম ERP ঠিক সময়ে ডেলিভারি দিয়েছে। পেশাদার টিম, পরিষ্কার যোগাযোগ।",
        "source": "direct",
        "is_verified": False,
        "is_featured": True,
    },
    {
        "product_slug": None,
        "customer_name": "Nusrat Jahan",
        "company": "Freelancer",
        "rating": 5,
        "review_en": "Top quality accessories at fair prices, and same-day delivery inside Sylhet!",
        "review_bn": "ন্যায্য দামে সেরা মানের এক্সেসরিজ, সিলেটের ভেতরে একই দিনে ডেলিভারি!",
        "source": "google",
        "is_verified": True,
        "is_featured": True,
    },
    {
        "product_slug": "earbuds-tws-pro",
        "customer_name": "Sazzad Ahmed",
        "company": None,
        "rating": 5,
        "review_en": "Sound quality is amazing for the price. Bass is deep and calls are clear.",
        "review_bn": "দামের তুলনায় সাউন্ড কোয়ালিটি অসাধারণ। বেজ গভীর, কলও পরিষ্কার শোনা যায়।",
        "source": "direct",
        "is_verified": True,
        "is_featured": False,
    },
    {
        "product_slug": "fast-charger-65w",
        "customer_name": "Mizanur Rahman",
        "company": None,
        "rating": 5,
        "review_en": "Genuinely fast — my phone charges fully in under an hour. Doesn't heat up either.",
        "review_bn": "সত্যিই দ্রুত — এক ঘণ্টার কমে ফোন ফুল চার্জ হয়। গরমও হয় না।",
        "source": "direct",
        "is_verified": True,
        "is_featured": False,
    },
    {
        "product_slug": "power-bank-20000",
        "customer_name": "Tanvir Hossain",
        "company": None,
        "rating": 4,
        "review_en": "Charges my phone 4 times easily. A bit heavy but that's expected at this capacity.",
        "review_bn": "সহজেই ফোন ৪ বার চার্জ করা যায়। একটু ভারী, তবে এই ক্যাপাসিটিতে সেটাই স্বাভাবিক।",
        "source": "direct",
        "is_verified": True,
        "is_featured": False,
    },
    {
        "product_slug": "phone-case-premium",
        "customer_name": "Sharmin Akter",
        "company": None,
        "rating": 5,
        "review_en": "Dropped my phone twice already — not a scratch. Fits perfectly.",
        "review_bn": "ফোন দুইবার পড়ে গেছে — একটুও দাগ পড়েনি। ফিটিংও পারফেক্ট।",
        "source": "facebook",
        "is_verified": True,
        "is_featured": False,
    },
    {
        "product_slug": "bt-speaker-waterproof",
        "customer_name": "Jahid Hasan",
        "company": None,
        "rating": 5,
        "review_en": "Took it on a picnic, survived rain and sounded great all day. Battery easily lasted.",
        "review_bn": "পিকনিকে নিয়ে গিয়েছিলাম, বৃষ্টিতেও সমস্যা হয়নি, সারাদিন দারুণ সাউন্ড। ব্যাটারিও অনায়াসে চলেছে।",
        "source": "direct",
        "is_verified": True,
        "is_featured": False,
    },
    {
        "product_slug": "glass-protector",
        "customer_name": "Rafiq Islam",
        "company": None,
        "rating": 4,
        "review_en": "Easy to install with the frame, no bubbles. Feels like the original screen.",
        "review_bn": "ফ্রেম দিয়ে সহজে লাগানো গেছে, কোনো বাবল নেই। আসল স্ক্রিনের মতোই লাগে।",
        "source": "direct",
        "is_verified": False,
        "is_featured": False,
    },
]

# Avatar photo keys (placeholder_assets._PHOTOS) for seeded product reviewers.
REVIEW_SEED_PHOTO_KEYS: dict[str, str] = {
    "Sazzad Ahmed": "review-3",
    "Mizanur Rahman": "review-1",
    "Tanvir Hossain": "review-3",
    "Sharmin Akter": "review-2",
    "Jahid Hasan": "review-1",
    "Rafiq Islam": "review-3",
}

# ---------------------------------------------------------------------------
# Extra blog posts — appended to the bootstrap catalog. Inserted only while
# the blog still contains nothing but seed posts (see content_bootstrap).
# ---------------------------------------------------------------------------

EXTRA_BLOG_SEED: list[dict] = [
    {
        "slug": "pos-software-guide-bd",
        "title_en": "Does Your Shop Need POS Software? A Practical Guide",
        "title_bn": "আপনার দোকানে কি POS সফটওয়্যার দরকার? একটি বাস্তব গাইড",
        "content_en": (
            "<p>If you run a retail shop, pharmacy or restaurant in Bangladesh, POS software can "
            "eliminate billing mistakes, track stock automatically and show you exactly which products "
            "make money.</p>"
            "<p>Signs you need a POS: daily sales are hard to total, stock runs out without warning, "
            "or you can't tell which items are most profitable. A well-fitted POS typically pays for "
            "itself within months through reduced errors and better stock decisions.</p>"
            "<p>ABO Enterprise builds custom POS systems for Sylhet businesses — with Bangla interfaces, "
            "thermal printing and offline support.</p>"
        ),
        "content_bn": (
            "<p>বাংলাদেশে রিটেইল দোকান, ফার্মেসি বা রেস্টুরেন্ট চালালে POS সফটওয়্যার বিলিং ভুল দূর করে, "
            "স্টক স্বয়ংক্রিয়ভাবে ট্র্যাক করে এবং কোন পণ্যে লাভ হচ্ছে তা স্পষ্ট দেখায়।</p>"
            "<p>POS দরকারের লক্ষণ: দৈনিক বিক্রি হিসাব করা কঠিন, স্টক হঠাৎ শেষ হয়ে যায়, বা কোন পণ্য বেশি "
            "লাভজনক তা বোঝা যায় না। সঠিক POS সাধারণত কয়েক মাসেই ভুল কমিয়ে ও স্টক সিদ্ধান্ত ভালো করে "
            "নিজের খরচ তুলে আনে।</p>"
            "<p>ABO Enterprise সিলেটের ব্যবসার জন্য কাস্টম POS তৈরি করে — বাংলা ইন্টারফেস, থার্মাল প্রিন্টিং "
            "ও অফলাইন সাপোর্ট সহ।</p>"
        ),
        "excerpt_en": "How to know when your shop is ready for POS software, and what it should cost.",
        "excerpt_bn": "কখন বুঝবেন আপনার দোকানে POS দরকার, আর খরচ কেমন হওয়া উচিত।",
        "category": "tips",
        "status": "published",
        "is_featured": False,
    },
    {
        "slug": "ai-for-small-business-bd",
        "title_en": "5 Ways Small Businesses in Bangladesh Can Use AI Today",
        "title_bn": "বাংলাদেশের ছোট ব্যবসায় AI ব্যবহারের ৫টি উপায়",
        "content_en": (
            "<p>AI is no longer only for big companies. Small businesses in Bangladesh are already "
            "using it for: 24/7 customer reply bots on Facebook pages, automatic invoice data entry "
            "from photos, sales forecasting from past data, Bangla content writing for marketing, "
            "and smart product recommendations in online shops.</p>"
            "<p>The key is starting small — automate one repetitive task first, measure the time "
            "saved, then expand. Most of our AI projects start under ৳20,000.</p>"
        ),
        "content_bn": (
            "<p>AI এখন আর শুধু বড় কোম্পানির জিনিস নয়। বাংলাদেশের ছোট ব্যবসাগুলো ইতিমধ্যে ব্যবহার করছে: "
            "Facebook পেজে ২৪/৭ অটো-রিপ্লাই বট, ছবি থেকে স্বয়ংক্রিয় ইনভয়েস ডাটা এন্ট্রি, আগের ডাটা থেকে "
            "বিক্রির পূর্বাভাস, মার্কেটিংয়ের জন্য বাংলা কনটেন্ট লেখা এবং অনলাইন শপে স্মার্ট পণ্য সাজেশন।</p>"
            "<p>মূল কথা হলো ছোট থেকে শুরু করা — প্রথমে একটি পুনরাবৃত্তিমূলক কাজ অটোমেট করুন, সময় সাশ্রয় মাপুন, "
            "তারপর বাড়ান। আমাদের বেশিরভাগ AI প্রজেক্ট ৳২০,০০০-এর নিচে শুরু হয়।</p>"
        ),
        "excerpt_en": "Practical, affordable AI use cases already working for Bangladeshi businesses.",
        "excerpt_bn": "বাংলাদেশি ব্যবসায় ইতিমধ্যে কাজ করছে এমন বাস্তব ও সাশ্রয়ী AI ব্যবহার।",
        "category": "technology",
        "status": "published",
        "is_featured": False,
    },
]

# Featured-image photo keys for the extra posts (placeholder_assets._PHOTOS).
EXTRA_BLOG_PHOTO_KEYS: dict[str, str] = {
    "pos-software-guide-bd": "pos-project",
    "ai-for-small-business-bd": "card-ai",
}

# ---------------------------------------------------------------------------
# Homepage section settings (site_* keys) — mirror the frontend fallbacks so
# seeding them changes nothing visually, but makes every section editable
# from Admin → Settings without hand-writing JSON.
# ---------------------------------------------------------------------------

SITE_ANNOUNCEMENTS: list[dict] = [
    {"en": "🎉 New AI Solutions available! Get 20% off on first consultation →", "bn": "🎉 নতুন AI সমাধান এসেছে! প্রথম পরামর্শে ২০% ছাড় পান →", "href": "/services"},
    {"en": "📦 Free delivery on orders over ৳2000 in Sylhet", "bn": "📦 সিলেটে ৳২০০০+ অর্ডারে ফ্রি ডেলিভারি", "href": "/products"},
    {"en": "💼 Custom POS & ERP Software for your business — Book a free demo", "bn": "💼 আপনার ব্যবসার জন্য কাস্টম POS ও ERP — ফ্রি ডেমো বুক করুন", "href": "/projects"},
]

SITE_TRUST_BADGES: list[dict] = [
    {"icon": "award", "en": "8+ Years Experience", "bn": "৮+ বছরের অভিজ্ঞতা"},
    {"icon": "users", "en": "10,000+ Customers", "bn": "১০,০০০+ গ্রাহক"},
    {"icon": "globe", "en": "Online & Offline", "bn": "অনলাইন ও অফলাইন"},
    {"icon": "headphones", "en": "Professional Support", "bn": "পেশাদার সাপোর্ট"},
    {"icon": "shield", "en": "Verified Business", "bn": "যাচাইকৃত ব্যবসা"},
    {"icon": "credit-card", "en": "Secure Payment", "bn": "নিরাপদ পেমেন্ট"},
]

SITE_WHY_CHOOSE: list[dict] = [
    {"icon": "award", "title_en": "8+ Years Experience", "title_bn": "৮+ বছরের অভিজ্ঞতা", "desc_en": "Nearly a decade serving customers with trust and consistency.", "desc_bn": "প্রায় এক দশক ধরে বিশ্বাস ও ধারাবাহিকতার সাথে গ্রাহক সেবা।"},
    {"icon": "store", "title_en": "Trusted Local Business", "title_bn": "বিশ্বস্ত স্থানীয় ব্যবসা", "desc_en": "An established name in Sylhet with a real storefront.", "desc_bn": "সিলেটে বাস্তব দোকানসহ একটি প্রতিষ্ঠিত নাম।"},
    {"icon": "globe", "title_en": "Online + Offline Service", "title_bn": "অনলাইন + অফলাইন সেবা", "desc_en": "Visit our shop or order online — the choice is yours.", "desc_bn": "দোকানে আসুন বা অনলাইনে অর্ডার করুন — পছন্দ আপনার।"},
    {"icon": "wrench", "title_en": "Experienced Engineers", "title_bn": "অভিজ্ঞ ইঞ্জিনিয়ার", "desc_en": "Skilled technicians for mobile, computer & software work.", "desc_bn": "মোবাইল, কম্পিউটার ও সফটওয়্যারের দক্ষ টেকনিশিয়ান।"},
    {"icon": "bot", "title_en": "AI Powered Solutions", "title_bn": "AI চালিত সমাধান", "desc_en": "Modern automation and AI to grow your business.", "desc_bn": "আপনার ব্যবসা বাড়াতে আধুনিক অটোমেশন ও AI।"},
    {"icon": "truck", "title_en": "Nationwide Service", "title_bn": "সারাদেশে সেবা", "desc_en": "Products and services delivered across Bangladesh.", "desc_bn": "সারা বাংলাদেশে পণ্য ও সেবা পৌঁছে দেওয়া।"},
]

SITE_QUICK_CATEGORIES: list[dict] = [
    {"icon": "smartphone", "label_en": "Tech Store", "label_bn": "টেক স্টোর", "desc_en": "Accessories · Gadgets · Electronics", "desc_bn": "এক্সেসরিজ · গ্যাজেট · ইলেকট্রনিক্স", "href": "/products"},
    {"icon": "file-text", "label_en": "Digital Services", "label_bn": "ডিজিটাল সেবা", "desc_en": "Passport · NID · bKash · Print", "desc_bn": "পাসপোর্ট · NID · বিকাশ · প্রিন্ট", "href": "/services#digital-services"},
    {"icon": "wrench", "label_en": "Software Lab", "label_bn": "সফটওয়্যার ল্যাব", "desc_en": "Mobile · Computer software", "desc_bn": "মোবাইল · কম্পিউটার সফটওয়্যার", "href": "/services#software-lab"},
    {"icon": "briefcase", "label_en": "Business Software", "label_bn": "বিজনেস সফটওয়্যার", "desc_en": "POS · ERP · IPTV · ISP Billing", "desc_bn": "POS · ERP · IPTV · ISP বিলিং", "href": "/services#business-software"},
    {"icon": "bot", "label_en": "AI Solutions", "label_bn": "AI সমাধান", "desc_en": "Assistant · Automation · Custom AI", "desc_bn": "অ্যাসিস্ট্যান্ট · অটোমেশন · কাস্টম AI", "href": "/services#ai-solutions"},
    {"icon": "globe", "label_en": "Web Development", "label_bn": "ওয়েব ডেভেলপমেন্ট", "desc_en": "Websites · Web apps · Software", "desc_bn": "ওয়েবসাইট · ওয়েব অ্যাপ · সফটওয়্যার", "href": "/services#web-software"},
    {"icon": "headphones", "label_en": "IT Support", "label_bn": "আইটি সাপোর্ট", "desc_en": "Networking · CCTV · Maintenance", "desc_bn": "নেটওয়ার্কিং · CCTV · রক্ষণাবেক্ষণ", "href": "/services#it-support"},
]

SITE_ENTRY_POINTS: list[dict] = [
    {
        "icon": "shopping-bag",
        "title_en": "Shop Tech Products", "title_bn": "টেক পণ্য কিনুন",
        "desc_en": "Mobile accessories, premium gadgets & electronics. Fast delivery across Sylhet.",
        "desc_bn": "মোবাইল এক্সেসরিজ, প্রিমিয়াম গ্যাজেট ও ইলেকট্রনিক্স। সিলেটে দ্রুত ডেলিভারি।",
        "cta_en": "Browse Products", "cta_bn": "পণ্য দেখুন",
        "href": "/products",
        "tags_en": ["Accessories", "Gadgets", "Electronics"],
        "tags_bn": ["এক্সেসরিজ", "গ্যাজেট", "ইলেকট্রনিক্স"],
    },
    {
        "icon": "calendar",
        "title_en": "Digital Service Center", "title_bn": "ডিজিটাল সার্ভিস সেন্টার",
        "desc_en": "Passport, NID, bKash, printing plus mobile & computer software support.",
        "desc_bn": "পাসপোর্ট, NID, বিকাশ, প্রিন্টিং এবং মোবাইল ও কম্পিউটার সফটওয়্যার সেবা।",
        "cta_en": "Explore Services", "cta_bn": "সেবা দেখুন",
        "href": "/services",
        "tags_en": ["Digital Services", "Printing", "Software Lab"],
        "tags_bn": ["ডিজিটাল সেবা", "প্রিন্টিং", "সফটওয়্যার ল্যাব"],
    },
    {
        "icon": "briefcase",
        "title_en": "Business Solutions", "title_bn": "ব্যবসা সমাধান",
        "desc_en": "POS, ERP, IPTV, ISP billing, AI automation & custom software for your business.",
        "desc_bn": "POS, ERP, IPTV, ISP বিলিং, AI অটোমেশন ও কাস্টম সফটওয়্যার আপনার ব্যবসার জন্য।",
        "cta_en": "Get a Free Quote", "cta_bn": "ফ্রি কোটেশন নিন",
        "href": "/projects",
        "tags_en": ["POS / ERP", "AI Solutions", "Custom Software"],
        "tags_bn": ["POS / ERP", "AI সমাধান", "কাস্টম সফটওয়্যার"],
    },
]

SITE_FAQ: list[dict] = [
    {"category": "products", "q_en": "What products do you sell?", "q_bn": "আপনারা কী কী পণ্য বিক্রি করেন?", "a_en": "We sell mobile accessories, phone cases, chargers, cables, power banks, gadgets and more. Delivery available across Sylhet.", "a_bn": "আমরা মোবাইল এক্সেসরিজ, ফোন কেস, চার্জার, কেবল, পাওয়ার ব্যাংক, গ্যাজেট ও আরও অনেক পণ্য বিক্রি করি। সিলেটে ডেলিভারি পাওয়া যায়।"},
    {"category": "services", "q_en": "How can I book a service?", "q_bn": "কিভাবে সেবা বুক করব?", "a_en": "Click 'Book a Service', fill the form with your details and requirements. We'll confirm within 2-4 hours.", "a_bn": "'সেবা বুক করুন' ক্লিক করুন, ফর্মে আপনার তথ্য ও প্রয়োজন লিখুন। আমরা ২-৪ ঘন্টার মধ্যে নিশ্চিত করব।"},
    {"category": "software", "q_en": "Do you develop custom software?", "q_bn": "আপনারা কি কাস্টম সফটওয়্যার বানান?", "a_en": "Yes! We build POS, ERP, CRM, school/hospital management systems, AI chatbots and any custom software your business needs.", "a_bn": "হ্যাঁ! আমরা POS, ERP, CRM, স্কুল/হাসপাতাল ম্যানেজমেন্ট সিস্টেম, AI চ্যাটবট এবং আপনার ব্যবসার যেকোনো কাস্টম সফটওয়্যার তৈরি করি।"},
    {"category": "payment", "q_en": "What are your payment methods?", "q_bn": "পেমেন্টের পদ্ধতি কী কী?", "a_en": "We accept bKash, Nagad, bank transfer and cash on delivery (for products in Sylhet).", "a_bn": "আমরা bKash, Nagad, ব্যাংক ট্রান্সফার এবং ক্যাশ অন ডেলিভারি (সিলেটে পণ্যের জন্য) গ্রহণ করি।"},
    {"category": "software", "q_en": "How long does software development take?", "q_bn": "সফটওয়্যার ডেভেলপমেন্ট কতদিন লাগে?", "a_en": "Simple projects take 1-2 weeks, medium projects 1-2 months, and complex enterprise systems 2-4 months. We always provide a timeline before starting.", "a_bn": "সহজ প্রজেক্ট ১-২ সপ্তাহ, মাঝারি প্রজেক্ট ১-২ মাস এবং জটিল এন্টারপ্রাইজ সিস্টেম ২-৪ মাস লাগে। শুরু করার আগে আমরা সবসময় টাইমলাইন দিই।"},
    {"category": "general", "q_en": "Do you offer after-sales support?", "q_bn": "বিক্রয়ের পর সাপোর্ট দেন কি?", "a_en": "Yes! All software projects include 3 months free support. Products have 7-day return policy for defects.", "a_bn": "হ্যাঁ! সব সফটওয়্যার প্রজেক্টে ৩ মাস ফ্রি সাপোর্ট আছে। পণ্যে ত্রুটি থাকলে ৭ দিনের রিটার্ন পলিসি আছে।"},
    {"category": "shipping", "q_en": "What are your delivery charges?", "q_bn": "ডেলিভারি চার্জ কত?", "a_en": "Free delivery in Sylhet city. Nationwide delivery starts from ৳60 depending on weight and location.", "a_bn": "সিলেট শহরে ফ্রি ডেলিভারি। সারাদেশে ওজন ও লোকেশন অনুযায়ী ৳৬০ থেকে শুরু।"},
    {"category": "shipping", "q_en": "How long does delivery take?", "q_bn": "ডেলিভারি কতদিন লাগে?", "a_en": "Same-day in Sylhet, 2-3 business days nationwide. Express options available on request.", "a_bn": "সিলেটে একই দিনে, সারাদেশে ২-৩ কর্মদিবস। অনুরোধে এক্সপ্রেস অপশন পাওয়া যায়।"},
]


def site_section_settings() -> list[dict]:
    """Settings rows for the admin-editable homepage sections."""
    sections = [
        ("site_announcements_json", SITE_ANNOUNCEMENTS, "Announcement bar messages (rotating)"),
        ("site_trust_badges_json", SITE_TRUST_BADGES, "Homepage trust badge strip"),
        ("site_why_choose_json", SITE_WHY_CHOOSE, "Homepage 'Why Choose Us' cards"),
        ("site_quick_categories_json", SITE_QUICK_CATEGORIES, "Homepage quick category tiles"),
        ("site_entry_points_json", SITE_ENTRY_POINTS, "Homepage 3-path entry point cards"),
        ("site_faq_json", SITE_FAQ, "Homepage + /faq question list"),
    ]
    return [
        {
            "key": key,
            "value": json.dumps(items, ensure_ascii=False),
            "data_type": "json",
            "description": description,
        }
        for key, items, description in sections
    ]
