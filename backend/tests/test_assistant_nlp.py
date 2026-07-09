"""Offline unit tests for the assistant's rule-based NLP.

No database or network needed — covers intent recognition (Bengali,
Banglish, English), preprocessing (Bengali digits, phones, quantities),
entity extraction against catalog names, coupon-code extraction, and
workflow yes/no/cancel detection.
"""
from __future__ import annotations

import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

import pytest

from app.assistant.nlp.preprocessor import preprocess_text, detect_language
from app.assistant.intent_engine import IntentEngine
from app.assistant.entity_extractor import EntityExtractor
from app.assistant.orchestrator import AssistantOrchestrator, _clean_search_query
from app.assistant.action_workflow import ActionWorkflowEngine


@pytest.fixture(scope="module")
def intent_engine():
    return IntentEngine()


@pytest.fixture(scope="module")
def orchestrator():
    return AssistantOrchestrator()


# ── Intent recognition ────────────────────────────────────────────────

INTENT_CASES = [
    ("hello", "greeting"),
    ("hlw", "greeting"),
    ("আসসালামু আলাইকুম", "greeting"),
    # "hi" inside "which" must NOT trigger greeting (word-boundary fix)
    ("which services do you offer?", "service_information"),
    ("dam koto?", "product_price"),
    ("দাম কত", "product_price"),
    ("what is the price of business card", "product_price"),
    ("stock ache?", "product_stock"),
    ("order korbo", "order_creation"),
    ("আমি একটা ল্যাপটপ কিনতে চাই", "order_creation"),
    ("অর্ডার ট্র্যাক করতে চাই", "order_tracking"),
    ("অর্ডার কোথায়", "order_tracking"),
    ("track my order ABO-2026-001", "order_tracking"),
    ("সেবা বুক করতে চাই", "service_booking"),
    ("booking dibo", "service_booking"),
    ("কি কি সেবা আছে", "service_information"),
    ("delivery charge koto?", "delivery"),
    ("কুপন আছে?", "coupon"),
    ("any coupons?", "coupon"),
    ("আপনাদের সাথে যোগাযোগ করব কিভাবে", "contact"),
    ("bkash e payment kora jabe?", "payment"),
    ("return korte chai", "return_policy"),
    ("invoice chai", "invoice"),
    ("ওয়ারেন্টি কত দিন", "warranty"),
]


@pytest.mark.parametrize("message,expected", INTENT_CASES)
def test_intent_recognition(intent_engine, message, expected):
    pre = preprocess_text(message)
    intent, _score = intent_engine.recognize(pre["normalized"])
    assert intent.value == expected, f"{message!r} → {intent.value}, expected {expected}"


def test_unrelated_text_is_unknown(intent_engine):
    pre = preprocess_text("this is amazing weather today")
    intent, _ = intent_engine.recognize(pre["normalized"])
    assert intent.value in ("unknown", "faq")


# Complaints must never be answered with a service/product list — "bad
# service" mentions "service" but is a complaint (negative_keywords fix).
COMPLAINT_CASES = [
    "bad service",
    "খারাপ সেবা পেয়েছি",
    "আপনাদের সার্ভিস খুব খারাপ",
    "আমার প্রোডাক্ট নষ্ট",
    "prodcut ta kaj korche na",
]


@pytest.mark.parametrize("message", COMPLAINT_CASES)
def test_complaints_not_misrouted_to_info_intents(intent_engine, message):
    pre = preprocess_text(message)
    intent, _ = intent_engine.recognize(pre["normalized"])
    assert intent.value == "complaint", f"{message!r} → {intent.value}"


@pytest.mark.parametrize("message", [
    "order cancel korte chai",
    "অর্ডার বাতিল করতে চাই",
    "how to cancel my order",
])
def test_cancellation_routes_to_support(intent_engine, message):
    """Cancellation had no intent at all and fell through to 'unknown' —
    route it to customer_support so the user gets contact info."""
    pre = preprocess_text(message)
    intent, _ = intent_engine.recognize(pre["normalized"])
    assert intent.value == "customer_support", f"{message!r} → {intent.value}"


def test_build_cost_question_is_quote_not_product_price(intent_engine):
    pre = preprocess_text("website banate koto lagbe?")
    intent, _ = intent_engine.recognize(pre["normalized"])
    assert intent.value == "quote", f"→ {intent.value}"


def test_show_products_is_product_search(intent_engine):
    pre = preprocess_text("show me your products")
    intent, _ = intent_engine.recognize(pre["normalized"])
    assert intent.value == "product_search", f"→ {intent.value}"


def test_reference_number_overrides_intent(orchestrator):
    """An explicit ABO-/BK-/LF- number must route to tracking regardless of
    what the surrounding words score ("ABO-2026-0001 কোথায়?" went to
    navigation before)."""
    from app.assistant.context_manager import ConversationContext

    cases = [
        ("ABO-2026-0001 কোথায়?", "order_tracking"),
        ("BK-2026-A3F2B1 status", "booking_tracking"),
        ("LF-2026-000123 er khobor ki", "lead_tracking"),
    ]
    for message, expected in cases:
        pre = preprocess_text(message)
        intent, _ = orchestrator.intent_engine.recognize(pre["normalized"])
        ctx = ConversationContext(session_id="t")
        resolved = orchestrator._resolve_follow_up_intent(intent, ctx, pre)
        assert resolved.value == expected, f"{message!r} → {resolved.value}"


def test_generic_catalog_questions_clean_to_empty_query():
    """'কি কি সেবা দেন আপনারা?' must list the catalog, not search for the
    junk tokens 'দেন আপনারা' (which found nothing and answered 'no services
    found')."""
    for message in ("কি কি সেবা দেন আপনারা?", "show me your products", "কি কি পণ্য আছে?"):
        pre = preprocess_text(message)
        assert _clean_search_query(pre["normalized"]) == "", message


# ── Preprocessing ─────────────────────────────────────────────────────

def test_bengali_digits_phone():
    pre = preprocess_text("আমার নম্বর ০১৭১২৩৪৫৬৭৮")
    assert pre["phones"] == ["01712345678"]
    # phone digits must not leak into quantities
    assert pre["quantities"] == []


def test_quantity_extraction():
    pre = preprocess_text("2 ta lagbe")
    assert 2 in pre["quantities"]


def test_banglish_hints_appended_not_inline():
    pre = preprocess_text("অর্ডার ট্র্যাক")
    # phrase stays intact at the start; hints go to the end
    assert pre["normalized"].startswith("অর্ডার ট্র্যাক")


def test_detect_language():
    assert detect_language("দাম কত") == "bn"
    assert detect_language("hello there") == "en"
    assert detect_language("laptop এর দাম কত") in ("bn", "mixed")


# ── Entity extraction against catalog names ──────────────────────────

def test_product_name_matched_inside_sentence():
    extractor = EntityExtractor()
    pre = preprocess_text("gaming laptop er dam koto?")
    result = extractor.extract(pre, product_names=["Gaming Laptop X200", "Business Card"])
    from app.assistant.constants import EntityType

    product = result.get(EntityType.PRODUCT)
    assert product is not None
    assert product.value == "Gaming Laptop X200"


def test_no_false_product_match():
    extractor = EntityExtractor()
    pre = preprocess_text("what are your business hours?")
    result = extractor.extract(pre, product_names=["Gaming Laptop X200"])
    from app.assistant.constants import EntityType

    assert result.get(EntityType.PRODUCT) is None


# ── Coupon code extraction ────────────────────────────────────────────

def test_plain_words_are_not_coupon_codes(orchestrator):
    pre = preprocess_text("any coupons available?")
    assert orchestrator._extract_coupon_codes(pre) == []


def test_real_looking_codes_are_extracted(orchestrator):
    pre = preprocess_text("apply ABO10 please")
    assert "ABO10" in orchestrator._extract_coupon_codes(pre)
    pre = preprocess_text("code SUMMER")
    assert "SUMMER" in orchestrator._extract_coupon_codes(pre)


# ── Search query cleaning ─────────────────────────────────────────────

def test_clean_search_query_strips_fillers():
    assert _clean_search_query("laptop er dam koto") == "laptop"
    assert _clean_search_query("আমি একটা ল্যাপটপ কিনতে চাই") == "ল্যাপটপ"
    assert _clean_search_query("show me the business card") == "business card"


# ── FAQ knowledge base with admin-defined trigger questions ──────────

def _kb_with(faq: dict):
    from app.assistant.knowledge_base import KnowledgeBase

    kb = KnowledgeBase()
    kb.reload_faq(faq)
    return kb


def test_faq_matches_admin_trigger_questions():
    kb = _kb_with({
        "outside_delivery_en": "Yes, we deliver everywhere in Bangladesh.",
        "outside_delivery_bn": "হ্যাঁ, আমরা সারাদেশে ডেলিভারি করি।",
        "outside_delivery_q": "ঢাকার বাইরে ডেলিভারি হয়?\ndhakar baire delivery\ndeliver outside dhaka",
    })
    pre = preprocess_text("dhakar baire delivery hoy ki?")
    hits = kb.search_faq(pre["normalized"], "en", limit=1)
    assert hits and hits[0]["key"] == "outside_delivery"

    pre = preprocess_text("ঢাকার বাইরে ডেলিভারি হয়?")
    hits = kb.search_faq(pre["normalized"], "bn", limit=1)
    assert hits and hits[0]["key"] == "outside_delivery"


def test_faq_question_match_outranks_answer_match():
    kb = _kb_with({
        # answer text mentions "delivery" but questions say nothing about it
        "warranty_en": "Warranty claims include free delivery of the replacement.",
        # this entry is explicitly taught the delivery question
        "outside_delivery_en": "Yes, we deliver everywhere.",
        "outside_delivery_q": "deliver outside dhaka\ndelivery outside",
    })
    hits = kb.search_faq("delivery outside dhaka", "en", limit=2)
    assert hits and hits[0]["key"] == "outside_delivery"


def test_faq_topics_ignore_question_keys():
    kb = _kb_with({"pay_en": "We accept bKash.", "pay_q": "how to pay"})
    assert kb.list_faq_topics() == ["pay"]


# ── Conversation context persistence (multi-turn workflow) ───────────

def test_from_dict_deep_copies_slots():
    """Loading a context must not share nested objects with the stored dict.

    Sharing them poisoned SQLAlchemy's JSON change-detection baseline so
    workflow-step updates were silently dropped — freezing booking/order/
    lead flows on their first step forever.
    """
    from app.assistant.context_manager import ContextManager

    cm = ContextManager()
    stored = {"session_id": "s1", "slots": {"workflow": {"type": "booking", "step": "details"}}}
    ctx = cm.from_dict(stored)
    ctx.slots["workflow"]["step"] = "confirm"

    # The stored dict (SQLAlchemy's loaded value) must stay untouched, so the
    # next save is detected as a real change and actually written.
    assert stored["slots"]["workflow"]["step"] == "details"
    assert ctx.slots["workflow"]["step"] == "confirm"


def test_context_round_trip_preserves_workflow_step():
    from app.assistant.context_manager import ContextManager, ConversationContext

    cm = ContextManager()
    ctx = ConversationContext(session_id="s1")
    ctx.slots["workflow"] = {"type": "booking", "step": "details", "data": {}}

    # simulate save → load
    reloaded = cm.from_dict(cm.to_dict(ctx))
    reloaded.slots["workflow"]["step"] = "confirm"
    reloaded2 = cm.from_dict(cm.to_dict(reloaded))
    assert reloaded2.slots["workflow"]["step"] == "confirm"


# ── Workflow yes/no/cancel ────────────────────────────────────────────

@pytest.fixture(scope="module")
def workflow(orchestrator):
    return orchestrator.action_workflow


@pytest.mark.parametrize("text", ["yes", "ok", "হ্যাঁ", "জি", "ji yes", "confirm", "hobe yes"])
def test_yes_words(workflow: ActionWorkflowEngine, text):
    assert workflow._is_yes(text)


@pytest.mark.parametrize("text", ["no", "না", "nah", "না লাগবে"])
def test_no_words(workflow: ActionWorkflowEngine, text):
    assert workflow._is_no(text)
    assert not workflow._is_yes(text)


@pytest.mark.parametrize("text", ["cancel", "বাতিল", "cancel koro", "থাক"])
def test_cancel_words(workflow: ActionWorkflowEngine, text):
    assert workflow._is_cancel(text)


def test_long_sentence_is_not_yes(workflow: ActionWorkflowEngine):
    assert not workflow._is_yes("yes but first tell me the delivery charge please")
