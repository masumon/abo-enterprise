"""Curated business knowledge for the ABO Enterprise assistant.

The intent engine only knows generic shop intents (product price, order tracking ...),
so real customer questions such as "পাসপোর্ট করতে কত টাকা লাগে?", "dokan kothay" or
"Do you repair mobile phones?" used to fall through to a generic "didn't understand".
This module answers those questions directly from a small, curated knowledge base:

* every entry lists trigger terms in Bangla, English and Banglish with a weight;
* answers are short, in the customer's language, and pull live facts (phone,
  WhatsApp, hours, address, delivery charges) from the admin settings, so nothing
  business-specific is hard-coded twice;
* entries the admin adds in Admin → AI Assistant → FAQ (`assistant_faq_knowledge`,
  `<topic>_q` holds the customer questions) are matched the same way and win ties,
  so the admin can teach or correct answers without a deploy.

No external AI or network call is involved.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any

_BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
_TOKEN_RE = re.compile(r"[a-z0-9]+|[ঀ-৿]+")

# Latin-script words that only appear when Bangla is typed in English letters.
BANGLISH_MARKERS = frozenset(
    "ki koto kot kothay kotha kothai kivabe kibhabe kemne keno ache achen achhe nai nei korte kore korben korbo "
    "lage lagbe lagbo taka tk dam dao den din amar amake apnader apnar apni tumi tomar vai bhai ase khola bondho "
    "kokhon kobe kon hobe hoy hocche parbo parben chai lagche dorkar jabe pabo pai ekta ekhon aj ajke kal "
    "thikana dokan ghor bari somoy deri thakbe ki? kno kn hbe krbo".split()
)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", (text or "").lower()).translate(_BN_DIGITS)
    text = text.replace("‍", "").replace("‌", "")
    return " ".join(_TOKEN_RE.findall(text))


def looks_banglish(text: str) -> bool:
    """Latin-script message written in Bangla (e.g. "apnader number ki")."""
    tokens = re.findall(r"[a-z]+", (text or "").lower())
    if not tokens or re.search(r"[ঀ-৿]", text or ""):
        return False
    hits = sum(1 for t in tokens if t in BANGLISH_MARKERS)
    return hits >= 1 and (hits / len(tokens) >= 0.2 or hits >= 2)


@dataclass
class KBEntry:
    id: str
    terms: dict[str, float]          # trigger phrase -> weight
    answer_bn: str
    answer_en: str
    links: list[dict] = field(default_factory=list)
    title_bn: str = ""
    title_en: str = ""
    admin: bool = False


@dataclass
class KBHit:
    id: str
    text: str
    links: list[dict]
    score: float


def _t(spec: str, weight: float) -> dict[str, float]:
    return {t.strip().lower(): weight for t in spec.split("|") if t.strip()}


def _terms(strong: str, medium: str = "", weak: str = "") -> dict[str, float]:
    out = _t(weak, 1.0)
    out.update(_t(medium, 2.0))
    out.update(_t(strong, 3.0))
    return out


CONTACT_LINK = {"label": "Contact page", "label_bn": "যোগাযোগ পেজ", "url": "/contact", "type": "page"}
SERVICES_LINK = {"label": "All services", "label_bn": "সব সেবা", "url": "/services", "type": "page"}
QUOTE_LINK = {"label": "Get a quote", "label_bn": "কোটেশন নিন", "url": "/services/quote", "type": "page"}

# Answers may use: {phone} {whatsapp} {email} {hours} {address} {free_min}
# {charge_sylhet} {charge_dhaka} {charge_outside} {site}
DEFAULT_ENTRIES: list[KBEntry] = [
    KBEntry(
        "location",
        _terms("ঠিকানা|লোকেশন|address|location|thikana|google map|ম্যাপ",
               "দোকান|অফিস|শোরুম|shop|office|dokan|showroom|map",
               "কোথায়|কোথায়|kothay|kothai|where|কই|koi|আসবো|asbo|যাব|jabo|কিভাবে যাব"),
        "📍 আমাদের ঠিকানা: {address}\n🕘 খোলা থাকে: {hours}\n\nআসার আগে কল বা WhatsApp করে নিলে ভালো হয় — {phone}।",
        "📍 Our address: {address}\n🕘 Open: {hours}\n\nPlease call or WhatsApp {phone} before you come.",
        [CONTACT_LINK], "ঠিকানা", "Address",
    ),
    KBEntry(
        "hours",
        _terms("খোলা|খোলে|বন্ধ|সময়সূচি|সময়সূচী|opening hours|open today|closing time|khola|bondho|office time|opening time",
               "কয়টা|কয়টায়|কখন|কতক্ষণ|সময়|timing|hours|open|close|kokhon|koyta|somoy|ajke|aj ki",
               "আজ|আজকে|today|শুক্রবার|friday|ছুটি|holiday"),
        "🕘 আমাদের সময়সূচি: {hours}।\nএর বাইরে WhatsApp-এ ({whatsapp}) মেসেজ রেখে যান — খোলার পর আমরা উত্তর দেব।",
        "🕘 Our opening hours: {hours}.\nOutside these hours, leave a WhatsApp message ({whatsapp}) and we will reply when we open.",
        [CONTACT_LINK], "খোলার সময়", "Opening hours",
    ),
    KBEntry(
        "contact",
        _terms("নম্বর|নাম্বার|ফোন|মোবাইল নম্বর|হোয়াটসঅ্যাপ|হোয়াটসএপ|ইমেইল|যোগাযোগ|whatsapp|phone number|number|contact|email|call|mobile number|imo",
               "কল|ফোন দিব|phone|mail|nombor|nambar|jogajog"),
        "📞 কল: {phone}\n💬 WhatsApp: {whatsapp}\n✉️ ইমেইল: {email}\n🕘 {hours}",
        "📞 Call: {phone}\n💬 WhatsApp: {whatsapp}\n✉️ Email: {email}\n🕘 {hours}",
        [CONTACT_LINK], "যোগাযোগ", "Contact",
    ),
    KBEntry(
        "services_overview",
        _terms("সেবাসমূহ|সেবা সমূহ|আমাদের সেবা|কী কী সেবা|কি কি সেবা|সব সেবা|our services|what services|all services|services|ki ki seba|seba gulo",
               "সেবা|service|seba"),
        "🧰 আমাদের সেবাসমূহ:\n• ডিজিটাল ও ই-সেবা — পাসপোর্ট, NID, জন্ম/মৃত্যু নিবন্ধন, ভিসা, অনলাইন আবেদন, বিল/রিচার্জ\n"
        "• প্রিন্টিং ও ডকুমেন্টেশন — প্রিন্ট, ফটোকপি, আইডি কার্ড, সিভি\n• মোবাইল ল্যাব — আনলক, রিপেয়ার, ডেটা রিকভারি\n"
        "• আইটি সাপোর্ট — কম্পিউটার, নেটওয়ার্ক, সিসিটিভি\n• ওয়েব ও সফটওয়্যার, POS/ERP, এআই ও অটোমেশন\n\nকোনটি নিয়ে জানতে চান, লিখুন।",
        "🧰 Our services:\n• Digital & e-services — passport, NID, birth/death registration, visa, online applications, bills/recharge\n"
        "• Printing & documents — print, photocopy, ID cards, CVs\n• Mobile lab — unlock, repair, data recovery\n"
        "• IT support — computers, networking, CCTV\n• Web & software, POS/ERP, AI & automation\n\nTell me which one you'd like to know about.",
        [SERVICES_LINK], "আমাদের সেবাসমূহ", "Our services",
    ),
    KBEntry(
        "passport",
        _terms("পাসপোর্ট|passport|ই-পাসপোর্ট|epassport|e passport",
               "নবায়ন|রিনিউ|renew|নতুন পাসপোর্ট|new passport"),
        "🛂 পাসপোর্ট সেবা: নতুন ই-পাসপোর্ট ও নবায়নের অনলাইন আবেদন, অ্যাপয়েন্টমেন্ট, ফি পেমেন্ট ও কাগজপত্র গুছিয়ে দেওয়া — সব আমরা করে দিই।\n\n"
        "💰 খরচ নির্ভর করে পাতার সংখ্যা (৪৮/৬৪), মেয়াদ (৫/১০ বছর) ও ডেলিভারির ধরনের ওপর — সরকারি ফি + আমাদের সার্ভিস চার্জ। "
        "আপনার জন্য সঠিক খরচ জানতে কল/WhatsApp করুন: {whatsapp}।\n"
        "📄 সঙ্গে আনুন: NID বা জন্ম নিবন্ধন, পুরনো পাসপোর্ট (নবায়নের ক্ষেত্রে)।",
        "🛂 Passport service: we handle new e-passport and renewal applications online — form, appointment, fee payment and paperwork.\n\n"
        "💰 The cost depends on pages (48/64), validity (5/10 years) and delivery type — government fee plus our service charge. "
        "For your exact cost, call/WhatsApp {whatsapp}.\n"
        "📄 Bring: NID or birth certificate, and your old passport for renewal.",
        [SERVICES_LINK], "পাসপোর্ট", "Passport",
    ),
    KBEntry(
        "nid",
        _terms("এনআইডি|জাতীয় পরিচয়পত্র|nid|voter id|national id|ভোটার আইডি|ভোটার",
               "সংশোধন|correction|হারানো|lost|কপি|copy|smart card|স্মার্ট কার্ড"),
        "🪪 NID সেবা: নতুন ভোটার নিবন্ধনের তথ্য, NID সংশোধনের অনলাইন আবেদন, হারানো NID-এর কপি ও অনলাইন কপি প্রিন্ট — আমরা আবেদন থেকে প্রিন্ট পর্যন্ত সাহায্য করি।\n\n"
        "📄 কোন কাজে কী কাগজ লাগবে তা কাজভেদে আলাদা — WhatsApp-এ ({whatsapp}) আপনার কাজটা লিখুন, তালিকা পাঠিয়ে দেব।",
        "🪪 NID service: voter registration guidance, online NID correction applications, lost-NID copies and online copy printing — we help from application to print.\n\n"
        "📄 Required documents depend on the task — WhatsApp us ({whatsapp}) with what you need and we'll send the list.",
        [SERVICES_LINK], "NID", "NID",
    ),
    KBEntry(
        "birth_death",
        _terms("জন্ম নিবন্ধন|মৃত্যু নিবন্ধন|জন্মনিবন্ধন|birth certificate|birth registration|death certificate|jonmo nibondhon|jonmo",
               "নিবন্ধন|registration|সনদ|certificate"),
        "📜 জন্ম ও মৃত্যু নিবন্ধন: নতুন নিবন্ধন, সংশোধন ও ইংরেজি কপির অনলাইন আবেদন আমরা করে দিই।\n"
        "কাগজপত্র ও খরচ জানতে কল/WhatsApp করুন: {whatsapp}।",
        "📜 Birth & death registration: we file new registrations, corrections and English-copy applications online.\n"
        "For documents and cost, call/WhatsApp {whatsapp}.",
        [SERVICES_LINK], "জন্ম/মৃত্যু নিবন্ধন", "Birth/death registration",
    ),
    KBEntry(
        "visa_travel",
        _terms("ভিসা|visa|ট্রাভেল|travel|বিমান টিকিট|air ticket|ticket",
               "বিদেশ|abroad|ওমরাহ|umrah|appointment|অ্যাপয়েন্টমেন্ট"),
        "✈️ ট্রাভেল ও ভিসা: ভিসা আবেদনের ফর্ম, অ্যাপয়েন্টমেন্ট ও প্রয়োজনীয় অনলাইন কাজে আমরা সহায়তা করি।\n"
        "কোন দেশ/কোন কাজ জানালে খরচ ও কাগজপত্র বলে দেব — WhatsApp: {whatsapp}।",
        "✈️ Travel & visa: we help with visa application forms, appointments and related online work.\n"
        "Tell us the country and the task and we'll share the cost and documents — WhatsApp {whatsapp}.",
        [SERVICES_LINK], "ভিসা ও ট্রাভেল", "Visa & travel",
    ),
    KBEntry(
        "online_apply",
        _terms("অনলাইন আবেদন|চাকরির আবেদন|job application|online application|form fill|ফর্ম পূরণ|রিচার্জ|recharge|বিল পরিশোধ|bill pay",
               "আবেদন|apply|application|ফর্ম|form|বিল|bill"),
        "🖥️ অনলাইন আবেদন: চাকরি, ভর্তি, সরকারি সেবা ইত্যাদির অনলাইন ফর্ম পূরণ, ফি পেমেন্ট ও প্রিন্ট — এছাড়া বিল পেমেন্ট ও রিচার্জ।\n"
        "দোকানে চলে আসুন অথবা WhatsApp করুন: {whatsapp}।",
        "🖥️ Online applications: job, admission and government-service forms, fee payment and printouts — plus bill payments and recharge.\n"
        "Visit us or WhatsApp {whatsapp}.",
        [SERVICES_LINK], "অনলাইন আবেদন", "Online applications",
    ),
    KBEntry(
        "printing",
        _terms("প্রিন্ট|প্রিন্টিং|ফটোকপি|print|printing|photocopy|স্ক্যান|scan|ল্যামিনেশন|lamination|সিভি|cv|resume|বায়োডাটা|biodata|আইডি কার্ড|id card|pvc card|প্লাস্টিক কার্ড",
               "কপি|copy|কার্ড|card|লিগ্যাল|ড্রাফট|draft|দরখাস্ত|application letter"),
        "🖨️ প্রিন্টিং ও ডকুমেন্টেশন: প্রিন্ট/ফটোকপি, স্ক্যান, ল্যামিনেশন, প্লাস্টিক আইডি কার্ড, সিভি/বায়োডাটা তৈরি ও দরখাস্ত-চুক্তিপত্রের খসড়া।\n"
        "রেট কাজ ও পরিমাণ অনুযায়ী — দোকানে আসুন অথবা ফাইল WhatsApp করুন: {whatsapp}।",
        "🖨️ Printing & documents: print/photocopy, scanning, lamination, plastic ID cards, CV/biodata writing and drafting letters or agreements.\n"
        "Rates depend on the job and quantity — visit us or WhatsApp the file to {whatsapp}.",
        [SERVICES_LINK], "প্রিন্টিং", "Printing",
    ),
    KBEntry(
        "mobile_lab",
        _terms("মোবাইল ঠিক|মোবাইল সার্ভিসিং|মোবাইল রিপেয়ার|ফোন ঠিক|repair|servicing|আনলক|unlock|ফ্ল্যাশ|flash|ডেটা রিকভারি|ডাটা রিকভারি|data recovery|frp",
               "রিপেয়ার|সার্ভিসিং|নষ্ট|খারাপ|ডিসপ্লে|display|ব্যাটারি|battery|পার্টস|parts|hang|হ্যাং|lock|লক|ঠিক করেন|thik",
               "মোবাইল|mobile|phone|ফোন"),
        "📱 মোবাইল ল্যাব: সফটওয়্যার আনলক, ফ্ল্যাশিং ও সমস্যা সমাধান, ডেটা রিকভারি এবং পার্টস বিক্রি।\n"
        "খরচ সমস্যা দেখে বলা হয় — ফোনটি নিয়ে আসুন অথবা আগে সমস্যাটা WhatsApp করুন: {whatsapp}।",
        "📱 Mobile lab: software unlock, flashing and fixes, data recovery and spare parts.\n"
        "We quote after checking the phone — bring it in or describe the problem on WhatsApp first: {whatsapp}.",
        [SERVICES_LINK], "মোবাইল ল্যাব", "Mobile repair",
    ),
    KBEntry(
        "it_support",
        _terms("কম্পিউটার|ল্যাপটপ|computer|laptop|pc|উইন্ডোজ|windows|os install|সিসিটিভি|cctv|নেটওয়ার্ক|network|networking|ওয়াইফাই|wifi|router|রাউটার|amc",
               "সেটআপ|setup|install|ইনস্টল|হার্ডওয়্যার|hardware|ক্যামেরা|camera|slow|স্লো"),
        "💻 আইটি সাপোর্ট: উইন্ডোজ/ওএস ইনস্টল, পিসি দ্রুত করা, নেটওয়ার্কিং ও ওয়াইফাই, সিসিটিভি বসানো, হার্ডওয়্যার সার্ভিসিং এবং প্রতিষ্ঠানের জন্য বার্ষিক (AMC) সাপোর্ট।\n"
        "কাজের বিবরণ দিলে খরচ জানিয়ে দেব — WhatsApp: {whatsapp}।",
        "💻 IT support: Windows/OS installation, PC optimisation, networking and Wi-Fi, CCTV installation, hardware servicing and annual (AMC) support for businesses.\n"
        "Send us the details for a price — WhatsApp {whatsapp}.",
        [SERVICES_LINK, QUOTE_LINK], "আইটি সাপোর্ট", "IT support",
    ),
    KBEntry(
        "web_software",
        _terms("ওয়েবসাইট|website|ওয়েব ডিজাইন|web design|সফটওয়্যার বানা|software develop|অ্যাপ বানা|app develop|ই-কমার্স|ecommerce|e-commerce|web development",
               "ওয়েব|web|সফটওয়্যার|software|অ্যাপ ডেভেলপমেন্ট|ডেভেলপ|develop|domain|ডোমেইন|hosting|হোস্টিং"),
        "🌐 ওয়েব ও সফটওয়্যার: ওয়েবসাইট ডিজাইন, ই-কমার্স সাইট, কাস্টম সফটওয়্যার, মোবাইল অ্যাপ ও ওয়েব মেইনটেন্যান্স।\n"
        "💰 দাম আপনার প্রয়োজনের ওপর নির্ভর করে — কোটেশন ফর্ম পূরণ করুন অথবা WhatsApp করুন: {whatsapp}।",
        "🌐 Web & software: website design, e-commerce sites, custom software, mobile apps and website maintenance.\n"
        "💰 Pricing depends on your requirements — fill in the quote form or WhatsApp {whatsapp}.",
        [QUOTE_LINK, SERVICES_LINK], "ওয়েব ও সফটওয়্যার", "Web & software",
    ),
    KBEntry(
        "pos_erp",
        _terms("পস|pos|ইআরপি|erp|বিলিং সফটওয়্যার|billing software|হিসাব সফটওয়্যার|accounting software|inventory software|দোকানের সফটওয়্যার|শপ সফটওয়্যার",
               "হিসাব|ইনভেন্টরি|inventory|বিলিং|billing|স্টক সফটওয়্যার"),
        "🧾 ব্যবসার সফটওয়্যার: দোকান ও প্রতিষ্ঠানের জন্য কাস্টম POS (বিক্রয়-বিলিং) ও ERP (হিসাব, স্টক, কর্মী) — আপনার ব্যবসার মাপে বানানো, ফ্রি ডেমো দেখানো হয়।\n"
        "💰 দাম ব্যবসার ধরন ও ফিচারের ওপর নির্ভর করে — ফ্রি ডেমো বুক করতে কোটেশন ফর্ম পূরণ করুন বা WhatsApp করুন: {whatsapp}।",
        "🧾 Business software: custom POS (sales & billing) and ERP (accounts, stock, staff) built for your business, with a free demo.\n"
        "💰 Price depends on your business and features — book a free demo via the quote form or WhatsApp {whatsapp}.",
        [QUOTE_LINK], "POS ও ERP", "POS & ERP",
    ),
    KBEntry(
        "ai_automation",
        _terms("এআই|ai|চ্যাটবট|chatbot|অটোমেশন|automation|পাইথন|python|কৃত্রিম বুদ্ধিমত্তা|artificial intelligence"),
        "🤖 এআই ও অটোমেশন: ব্যবসার চ্যাটবট, পাইথন দিয়ে কাজ স্বয়ংক্রিয় করা ও বিজনেস এআই টুলস।\n"
        "আপনার কাজটা জানালে সমাধান ও খরচ প্রস্তাব করব — কোটেশন ফর্ম বা WhatsApp: {whatsapp}। চলমান অফার হোমপেজের ঘোষণায় দেখুন।",
        "🤖 AI & automation: business chatbots, Python automation and business AI tools.\n"
        "Tell us the task and we'll propose a solution and price — quote form or WhatsApp {whatsapp}. Current offers are on the homepage banner.",
        [QUOTE_LINK], "এআই ও অটোমেশন", "AI & automation",
    ),
    KBEntry(
        "apon_app",
        _terms("আপন|apon|apk|অ্যাপ ডাউনলোড|app download|download app|আপনাদের অ্যাপ|your app"),
        "📲 আপন — আমাদের ফ্রি Android অ্যাপ: কাজ, টাকার হিসাব, দেনা-পাওনা আর ওষুধ — সব এক খাতায়। ইন্টারনেট ছাড়াই চলে, তথ্য থাকে শুধু আপনার ফোনে।\n"
        "ডাউনলোড করুন: aboenterprise.com/apon",
        "📲 Apon — our free Android app: tasks, money, debts and medicines in one notebook. Works offline and your data stays on your phone.\n"
        "Download: aboenterprise.com/apon",
        [{"label": "Download Apon", "label_bn": "আপন ডাউনলোড", "url": "/apon", "type": "page"}], "আপন অ্যাপ", "Apon app",
    ),
    KBEntry(
        "delivery",
        _terms("ডেলিভারি|delivery|ফ্রি ডেলিভারি|free delivery|কুরিয়ার|courier|শিপিং|shipping|ডেলিভারি চার্জ|delivery charge",
               "পাঠান|পাঠাবেন|home delivery|হোম ডেলিভারি|কতদিন|কয়দিন"),
        "🚚 ডেলিভারি চার্জ: সিলেট ৳{charge_sylhet}, ঢাকা ৳{charge_dhaka}, অন্যান্য জেলা ৳{charge_outside}।\n"
        "🎁 ৳{free_min} বা বেশি অর্ডারে ফ্রি ডেলিভারি (চেকআউটে চূড়ান্ত চার্জ দেখাবে)।\n"
        "অর্ডারের পর অনলাইনে ট্র্যাক করতে পারবেন।",
        "🚚 Delivery charge: Sylhet ৳{charge_sylhet}, Dhaka ৳{charge_dhaka}, other districts ৳{charge_outside}.\n"
        "🎁 Free delivery on orders of ৳{free_min} or more (checkout shows the final charge).\n"
        "You can track your order online after ordering.",
        [{"label": "Track order", "label_bn": "অর্ডার ট্র্যাক", "url": "/track", "type": "page"}], "ডেলিভারি", "Delivery",
    ),
    KBEntry(
        "payment",
        _terms("পেমেন্ট|payment|বিকাশ|bkash|রকেট|rocket|ক্যাশ অন ডেলিভারি|cash on delivery|cod|কার্ড|card|ভিসা কার্ড|mastercard|পেমেন্ট পদ্ধতি",
               "টাকা দিব|কিভাবে টাকা|how to pay|pay"),
        "💳 পেমেন্ট: ক্যাশ অন ডেলিভারি, বিকাশ, রকেট, কার্ড (Visa/Mastercard/Amex) ও DBBL Nexus। চেকআউটে আপনার জন্য চালু পদ্ধতিগুলো দেখাবে।",
        "💳 Payment: cash on delivery, bKash, Rocket, cards (Visa/Mastercard/Amex) and DBBL Nexus. Checkout shows the methods available to you.",
        [], "পেমেন্ট", "Payment",
    ),
    KBEntry(
        "accessories",
        _terms("এক্সেসরিজ|accessories|চার্জার|charger|ক্যাবল|cable|হেডফোন|headphone|earphone|ইয়ারফোন|পাওয়ার ব্যাংক|power bank|গ্যাজেট|gadget|স্মার্টওয়াচ|smart watch",
               "পণ্য|product|কিনতে|kinbo|buy"),
        "🛍️ আমরা মোবাইল এক্সেসরিজ ও গ্যাজেট বিক্রি করি — চার্জার, ক্যাবল, হেডফোন, পাওয়ার ব্যাংক ইত্যাদি।\n"
        "কোন পণ্য স্টকে আছে ও দাম জানতে পণ্য পেজ দেখুন অথবা WhatsApp করুন: {whatsapp}।",
        "🛍️ We sell mobile accessories and gadgets — chargers, cables, headphones, power banks and more.\n"
        "Check the products page or WhatsApp {whatsapp} for stock and prices.",
        [{"label": "Products", "label_bn": "পণ্য", "url": "/products", "type": "page"}], "এক্সেসরিজ", "Accessories",
    ),
    KBEntry(
        "about",
        _terms("আপনারা কারা|কোম্পানি সম্পর্কে|about you|about company|who are you|এবিও কি|abo mane|abo কি|তোমরা কারা",
               "কোম্পানি|company|প্রতিষ্ঠান|about"),
        "🏢 {site} (ABO — Sumon Brothers Organization) সিলেটের বিয়ানীবাজারভিত্তিক প্রতিষ্ঠান: মোবাইল এক্সেসরিজ, ডিজিটাল ও ই-সেবা, প্রিন্টিং, মোবাইল ল্যাব, আইটি সাপোর্ট, ওয়েব-সফটওয়্যার, POS/ERP ও এআই — সব এক ছাদের নিচে।",
        "🏢 {site} (ABO — Sumon Brothers Organization) is based in Beanibazar, Sylhet: mobile accessories, digital & e-services, printing, a mobile lab, IT support, web & software, POS/ERP and AI — all under one roof.",
        [{"label": "About us", "label_bn": "আমাদের সম্পর্কে", "url": "/about", "type": "page"}], "আমাদের সম্পর্কে", "About us",
    ),
    KBEntry(
        "human",
        _terms("মানুষের সাথে|এজেন্ট|কাস্টমার কেয়ার|কাস্টমার সার্ভিস|human|agent|real person|customer care|customer service|operator|অভিযোগ করতে চাই",
               "কথা বলতে চাই|কথা বলব|talk to|speak to"),
        "🙋 অবশ্যই! আমাদের টিমের সাথে সরাসরি কথা বলুন:\n📞 কল: {phone}\n💬 WhatsApp: {whatsapp}\n🕘 {hours}",
        "🙋 Of course! Talk to our team directly:\n📞 Call: {phone}\n💬 WhatsApp: {whatsapp}\n🕘 {hours}",
        [CONTACT_LINK], "টিমের সাথে কথা", "Talk to our team",
    ),
    KBEntry(
        "thanks",
        _terms("ধন্যবাদ|thanks|thank you|thank u|thx|শুকরিয়া|dhonnobad|ok thanks"),
        "আপনাকেও ধন্যবাদ! 😊 আর কিছু জানার থাকলে লিখুন।",
        "You're welcome! 😊 Let me know if there's anything else.",
        [], "", "",
    ),
    KBEntry(
        "rude",
        _terms("ছাগল|বোকা|গাধা|বলদ|stupid|idiot|fool|useless|bokachoda|faltu|ফালতু|chagol|bolod|gadha"),
        "দুঃখিত, আমার উত্তরে আপনি সন্তুষ্ট নন। 🙏 আপনার প্রশ্নটা একটু অন্যভাবে লিখুন, অথবা সরাসরি আমাদের টিমের সাথে কথা বলুন — WhatsApp: {whatsapp}।",
        "Sorry I couldn't help as you expected. 🙏 Please rephrase your question, or talk to our team directly — WhatsApp {whatsapp}.",
        [CONTACT_LINK], "", "",
    ),
    KBEntry(
        "refund",
        _terms("রিফান্ড|refund|ফেরত|return|রিটার্ন|ওয়ারেন্টি|warranty|গ্যারান্টি|guarantee|exchange|বদল"),
        "↩️ রিটার্ন, রিফান্ড ও ওয়ারেন্টির নিয়ম আমাদের নীতিমালা পেজে আছে। পণ্যে সমস্যা হলে অর্ডার নম্বরসহ WhatsApp করুন ({whatsapp}) — আমরা দ্রুত সমাধান করব।",
        "↩️ Our return, refund and warranty rules are on the policy page. If something is wrong with a product, WhatsApp us ({whatsapp}) with your order number and we'll sort it out quickly.",
        [{"label": "Refund policy", "label_bn": "রিফান্ড নীতি", "url": "/legal/refund", "type": "page"}], "রিটার্ন ও ওয়ারেন্টি", "Returns & warranty",
    ),
]

THRESHOLD = 3.0
SUGGEST_MIN = 1.5


# Endings a Bangla word may carry and still mean the same thing (দোকানে, পাসপোর্টের,
# নম্বরটা, বানাতে). Deliberately excludes "ার"/"াদের" so আপন (the app) never matches আপনার.
_BN_SUFFIXES = ("", "ে", "ের", "র", "টা", "টি", "টার", "টির", "টাই", "গুলো", "গুলোর", "কে", "তে", "য়", "য়ে",
                "ও", "ই", "রা", "দের", "েই", "েও", "েরও", "ো", "বো", "বেন", "নো", "ন", "লে", "চ্ছে", "চ্ছি", "তাম")


def _word_match(pw: str, tok: str) -> bool:
    if tok == pw:
        return True
    if len(pw) >= 3 and re.match(r"[ঀ-৿]", pw) and tok.startswith(pw):
        return tok[len(pw):] in _BN_SUFFIXES
    return False


def _phrase_in(phrase: str, text: str, tokens: set[str]) -> bool:
    words = phrase.split()
    if len(words) == 1:
        return any(_word_match(words[0], t) for t in tokens)
    seq = text.split()
    n = len(words)
    return any(all(_word_match(w, seq[i + j]) for j, w in enumerate(words)) for i in range(len(seq) - n + 1))


def _fuzzy_in(phrase: str, tokens: set[str]) -> bool:
    """Typo tolerance for single Latin words of 5+ letters (pasport, delivary)."""
    if " " in phrase or len(phrase) < 5 or not phrase.isascii():
        return False
    return any(len(t) >= 4 and abs(len(t) - len(phrase)) <= 2 and SequenceMatcher(None, t, phrase).ratio() >= 0.84 for t in tokens)


class BusinessKnowledge:
    def __init__(self) -> None:
        self.entries = list(DEFAULT_ENTRIES)

    @staticmethod
    def admin_entries(faq: dict[str, str]) -> list[KBEntry]:
        """Turn Admin → AI Assistant FAQ topics into matchable entries.

        `<topic>_q` lists customer questions/keywords (comma, '|' or newline separated);
        each one becomes a strong trigger, and its single words become medium ones.
        """
        out: list[KBEntry] = []
        topics = {k.rsplit("_", 1)[0] for k in faq if k.endswith("_q")}
        for topic in sorted(topics):
            raw = faq.get(f"{topic}_q") or ""
            phrases = [normalize(p) for p in re.split(r"[,|\n،;]+", raw) if normalize(p)]
            if not phrases:
                continue
            terms: dict[str, float] = {}
            for p in phrases:
                terms[p] = 3.0
                for w in p.split():
                    if len(w) >= 3:
                        terms.setdefault(w, 1.5)
            bn = faq.get(f"{topic}_bn") or faq.get(f"{topic}_en") or ""
            en = faq.get(f"{topic}_en") or bn
            if bn or en:
                out.append(KBEntry(f"admin:{topic}", terms, bn, en, [], topic, topic, admin=True))
        return out

    def score(self, text: str, entries: list[KBEntry]) -> list[tuple[float, KBEntry]]:
        norm = normalize(text)
        tokens = set(norm.split())
        ranked: list[tuple[float, KBEntry]] = []
        for e in entries:
            s = 0.0
            for phrase, w in e.terms.items():
                p = normalize(phrase)
                if not p:
                    continue
                if _phrase_in(p, norm, tokens) or _fuzzy_in(p, tokens):
                    s += w
            if s > 0:
                ranked.append((s + (0.25 if e.admin else 0.0), e))
        ranked.sort(key=lambda x: x[0], reverse=True)
        return ranked

    def answer(self, text: str, lang: str, facts: dict[str, Any], faq: dict[str, str] | None = None) -> KBHit | None:
        entries = self.admin_entries(faq or {}) + self.entries
        ranked = self.score(text, entries)
        if not ranked or ranked[0][0] < THRESHOLD:
            return None
        score, e = ranked[0]
        template = e.answer_bn if lang == "bn" else e.answer_en
        return KBHit(e.id, fill(template, facts), list(e.links), score)

    def facts_text(self, lang: str, facts: dict[str, Any], faq: dict[str, str] | None = None) -> str:
        """Every curated answer (filled with live facts) — the only material the AI may use."""
        parts = []
        for e in self.admin_entries(faq or {}) + self.entries:
            if e.id in ("thanks", "rude"):
                continue
            body = fill(e.answer_bn if lang == "bn" else e.answer_en, facts)
            title = (e.title_bn if lang == "bn" else e.title_en) or e.id
            parts.append(f"[{title}]\n{body}")
        return "\n\n".join(parts)[:12000]

    def suggestions(self, text: str, lang: str) -> list[str]:
        """Topic titles that partly match — offered as 'did you mean' chips."""
        out = []
        for s, e in self.score(text, self.entries):
            title = e.title_bn if lang == "bn" else e.title_en
            if s >= SUGGEST_MIN and title and title not in out:
                out.append(title)
        return out[:3]


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return ""


def fill(template: str, facts: dict[str, Any]) -> str:
    values = _SafeDict({k: ("" if v is None else v) for k, v in facts.items()})
    out = []
    for line in template.split("\n"):
        filled = line.format_map(values)
        # Drop a line only when it held a fact that turned out empty (e.g. "📍 আমাদের ঠিকানা: ");
        # plain heading lines such as "🧰 আমাদের সেবাসমূহ:" stay.
        if "{" in line and re.search(r"[:：]\s*$", filled.strip()):
            continue
        out.append(filled)
    return "\n".join(out).strip()


def contact_links(facts: dict[str, Any]) -> list[dict]:
    links = []
    phone = re.sub(r"\D", "", str(facts.get("phone") or ""))
    wa = re.sub(r"\D", "", str(facts.get("whatsapp") or ""))
    if wa:
        wa = "88" + wa if wa.startswith("01") else wa
        links.append({"label": "WhatsApp", "label_bn": "WhatsApp", "url": f"https://wa.me/{wa}", "type": "whatsapp"})
    if phone:
        links.append({"label": "Call", "label_bn": "কল করুন", "url": f"tel:+{'88' + phone if phone.startswith('01') else phone}", "type": "call"})
    return links
