"""Real customer questions must reach the right business answer (Bangla, English, Banglish)."""
import pytest

from app.assistant.business_kb import BusinessKnowledge, contact_links, fill, looks_banglish

FACTS = {
    "phone": "01885411007", "whatsapp": "01885411007", "email": "info@aboenterprise.com",
    "hours": "শনি-বৃহঃ, সকাল ১০টা-রাত ১০টা", "address": "হাজী বাহার উদ্দিন মার্কেট, বিয়ানীবাজার, সিলেট",
    "free_min": "2000", "charge_sylhet": "50", "charge_dhaka": "60", "charge_outside": "120", "site": "ABO Enterprise",
}

CASES = [
    # the questions that failed in the 2026-10-09 live audit
    ("পাসপোর্ট করতে কত টাকা লাগে?", "passport"),
    ("আপনাদের দোকান কোথায়?", "location"),
    ("আজকে খোলা আছে?", "hours"),
    ("ফ্রি ডেলিভারি কিভাবে পাবো?", "delivery"),
    ("POS সফটওয়্যার এর দাম কত?", "pos_erp"),
    ("আপন অ্যাপ কি?", "apon_app"),
    ("apnader number ki", "contact"),
    ("Do you repair mobile phones?", "mobile_lab"),
    ("What are your opening hours?", "hours"),
    ("NID correction korte ki lage?", "nid"),
    ("tui ekta chagol", "rude"),
    # more real phrasings
    ("pasport renew korte chai", "passport"),
    ("ই-পাসপোর্ট নবায়ন", "passport"),
    ("জন্ম নিবন্ধন সংশোধন করবো", "birth_death"),
    ("birth certificate korbo", "birth_death"),
    ("ভিসার আবেদন করতে চাই", "visa_travel"),
    ("চাকরির আবেদন অনলাইনে করে দেন?", "online_apply"),
    ("আইডি কার্ড বানাতে কত খরচ", "printing"),
    ("ফটোকপি করা যাবে?", "printing"),
    ("cv banate chai", "printing"),
    ("ফোনের ডিসপ্লে নষ্ট, রিপেয়ার হবে?", "mobile_lab"),
    ("data recovery possible?", "mobile_lab"),
    ("ল্যাপটপে উইন্ডোজ দিতে চাই", "it_support"),
    ("CCTV install korte koto lagbe", "it_support"),
    ("অ্যাপ বানাতে চাই", "web_software"),
    ("I need a website for my business", "web_software"),
    ("dokaner jonno billing software", "pos_erp"),
    ("chatbot banan?", "ai_automation"),
    ("apon app download", "apon_app"),
    ("delivery charge koto?", "delivery"),
    ("ঢাকায় ডেলিভারি দেন?", "delivery"),
    ("বিকাশে পেমেন্ট করা যাবে?", "payment"),
    ("ভিসা কার্ডে পেমেন্ট করা যাবে?", "payment"),
    ("চার্জার আছে?", "accessories"),
    ("where is your shop", "location"),
    ("thikana ta din", "location"),
    ("whatsapp number?", "contact"),
    ("আপনাদের ইমেইল কি", "contact"),
    ("আমি মানুষের সাথে কথা বলতে চাই", "human"),
    ("ধন্যবাদ", "thanks"),
    ("রিফান্ড পাবো কিভাবে?", "refund"),
    ("আপনারা কারা?", "about"),
]


@pytest.mark.parametrize("question,topic", CASES)
def test_real_questions_reach_the_right_topic(question, topic):
    hit = BusinessKnowledge().answer(question, "bn", FACTS)
    assert hit is not None, question
    assert hit.id == topic, (question, hit.id)


@pytest.mark.parametrize("question", [
    "asdfgh qwerty zxcv",
    "আমার অর্ডার কোথায়",          # order tracking stays with the order flow
    "আপনার নাম কি",              # "আপনার" must not be read as the Apon app
    "hello",
])
def test_unrelated_or_transactional_questions_are_left_alone(question):
    assert BusinessKnowledge().answer(question, "bn", FACTS) is None


def test_answers_use_live_facts_and_language():
    kb = BusinessKnowledge()
    bn = kb.answer("আপনাদের নম্বর কত", "bn", FACTS)
    en = kb.answer("what is your phone number", "en", FACTS)
    assert "01885411007" in bn.text and "কল" in bn.text
    assert "Call" in en.text and "01885411007" in en.text
    assert "01825007977" not in bn.text + en.text
    delivery = kb.answer("delivery charge", "bn", FACTS).text
    assert "৳50" in delivery and "৳2000" in delivery


def test_admin_faq_entries_are_matched_and_win():
    faq = {"wedding_q": "বিয়ের কার্ড, wedding card", "wedding_bn": "হ্যাঁ, বিয়ের কার্ড ছাপাই।", "wedding_en": "Yes, we print wedding cards."}
    hit = BusinessKnowledge().answer("বিয়ের কার্ড ছাপান?", "bn", FACTS, faq)
    assert hit.id == "admin:wedding" and "বিয়ের কার্ড" in hit.text


def test_banglish_detection():
    assert looks_banglish("apnader number ki")
    assert looks_banglish("NID correction korte ki lage?")
    assert not looks_banglish("What are your opening hours?")
    assert not looks_banglish("পাসপোর্ট")


def test_empty_fact_lines_are_dropped_and_links_are_valid():
    text = fill("📍 ঠিকানা: {address}\nকল: {phone}", {"address": "", "phone": "01885411007"})
    assert "ঠিকানা" not in text and "01885411007" in text
    links = contact_links(FACTS)
    assert links[0]["url"] == "https://wa.me/8801885411007"
    assert links[1]["url"] == "tel:+8801885411007"
