from __future__ import annotations

from app.assistant.analytics_engine import AnalyticsEngine
from app.assistant.confidence_engine import ConfidenceEngine
from app.assistant.constants import EntityType, Intent
from app.assistant.decision_engine import DecisionEngine
from app.assistant.document_parser import DocumentParser
from app.assistant.entity_extractor import EntityResult, ExtractedEntity
from app.assistant.entity_normalizer import EntityNormalizer
from app.assistant.feedback_engine import FeedbackEngine
from app.assistant.indexing_engine import IndexingEngine
from app.assistant.ingestion_engine import IngestionEngine
from app.assistant.memory_engine import MemoryEngine
from app.assistant.plugin_manager import PluginManager
from app.assistant.ranking_engine import RankingEngine
from app.assistant.reasoning_engine import ReasoningEngine
from app.assistant.recommendation_engine import RecommendationEngine
from app.assistant.response_validator import ResponseValidator
from app.assistant.semantic_matcher import SemanticMatcher
from app.assistant.spell_corrector import SpellCorrector
from app.assistant.tool_registry import ToolRegistry, ToolSpec
from app.assistant.context_manager import ConversationContext


def test_memory_engine_remember_and_recall() -> None:
    engine = MemoryEngine()
    ctx = ConversationContext(session_id="s1")
    engine.remember_turn(ctx, user_message="hello", assistant_message="hi", intent="greeting")
    history = engine.recall(ctx)
    assert len(history) == 1
    assert history[0].intent == "greeting"


def test_reasoning_engine_basic() -> None:
    result = ReasoningEngine().analyze(intent=Intent.PRODUCT_SEARCH, confidence=0.8, entity_count=2)
    assert "product_search" in result.summary
    assert result.steps


def test_decision_engine_fallback_for_low_confidence() -> None:
    result = DecisionEngine().decide(intent=Intent.PRODUCT_SEARCH, confidence=0.1)
    assert result.action == "fallback_unknown"


def test_confidence_engine_calibration_bounds() -> None:
    value = ConfidenceEngine().calibrate(base_confidence=0.95, entity_count=10, has_session_context=True)
    assert 0.0 <= value <= 1.0


def test_ranking_engine_orders_descending() -> None:
    ranked = RankingEngine().rank(["a", "bbb", "cc"], score_fn=len)
    assert [x.item for x in ranked] == ["bbb", "cc", "a"]


def test_document_parser_json_and_text() -> None:
    parser = DocumentParser()
    doc_json = parser.parse(payload=b'{"k":1}', content_type="application/json")
    doc_text = parser.parse(payload=b"hello", content_type="text/plain")
    assert "k" in doc_json.text
    assert doc_text.text == "hello"


def test_ingestion_engine_chunking() -> None:
    engine = IngestionEngine()
    chunks = engine.ingest(doc_id="d1", payload=("x" * 1200).encode("utf-8"), content_type="text/plain")
    assert len(chunks) >= 2
    assert chunks[0].doc_id == "d1"


def test_indexing_engine_search() -> None:
    ingestion = IngestionEngine()
    chunks = ingestion.ingest(doc_id="d2", payload=b"order booking delivery", content_type="text/plain")
    index = IndexingEngine()
    count = index.index(chunks)
    results = index.search("booking")
    assert count >= 1
    assert results


def test_semantic_matcher_score() -> None:
    matcher = SemanticMatcher()
    assert matcher.score("order tracking", "track order status") > 0


def test_spell_corrector_replacements() -> None:
    corrected = SpellCorrector().correct("delivary and warrenty")
    assert "delivery" in corrected
    assert "warranty" in corrected


def test_entity_normalizer_standardizes_values() -> None:
    result = EntityResult(
        entities=[
            ExtractedEntity(type=EntityType.PHONE, value="+88 01712-345678"),
            ExtractedEntity(type=EntityType.EMAIL, value="USER@EXAMPLE.COM"),
        ]
    )
    normalized = EntityNormalizer().normalize(result)
    assert normalized.entities[0].value == "01712345678"
    assert normalized.entities[1].value == "user@example.com"


def test_recommendation_engine_dedupes() -> None:
    recs = RecommendationEngine().recommend(["Track order", "track order", "Contact"])
    assert len(recs) == 2


def test_analytics_engine_payload() -> None:
    engine = AnalyticsEngine()
    event = engine.build_event(session_id="s", intent="faq", confidence=0.8, latency_ms=12)
    payload = engine.as_dict(event)
    assert payload["intent"] == "faq"
    assert payload["latency_ms"] == 12


def test_feedback_engine_detects_positive_and_negative() -> None:
    feedback = FeedbackEngine()
    assert feedback.detect("thanks great").label == "positive"
    assert feedback.detect("bad wrong").label == "negative"


def test_response_validator_rejects_empty() -> None:
    result = ResponseValidator().validate("   ")
    assert result.valid is False


def test_tool_registry_and_plugin_manager_execution() -> None:
    registry = ToolRegistry()
    registry.register(ToolSpec(name="adder", handler=lambda x, y: x + y, description="sum"))
    manager = PluginManager(registry)
    assert manager.execute("adder", x=2, y=3) == 5
