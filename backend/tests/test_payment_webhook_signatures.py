"""Pure crypto coverage for the bKash/Nagad payment-webhook signature
checks (payments.py, core/nagad.py) — no live database or network call
involved. These gate whether an inbound "payment succeeded" webhook is
trusted, so a broken comparison here is a real-money bug.
"""
import hashlib
import hmac

from app.api.v1.routes.payments import _verify_bkash_webhook
from app.core.config import settings
from app.core.nagad import NagadGateway


class TestBkashWebhookSignature:
    def test_valid_signature_accepted(self, monkeypatch):
        monkeypatch.setattr(settings, "BKASH_APP_SECRET", "test-secret")
        body = b'{"paymentID": "TR0001", "status": "Completed"}'
        signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
        assert _verify_bkash_webhook(body, signature) is True

    def test_tampered_body_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "BKASH_APP_SECRET", "test-secret")
        body = b'{"paymentID": "TR0001", "status": "Completed"}'
        signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
        tampered_body = b'{"paymentID": "TR0001", "status": "Failed"}'
        assert _verify_bkash_webhook(tampered_body, signature) is False

    def test_wrong_secret_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "BKASH_APP_SECRET", "real-secret")
        body = b"payload"
        signature = hmac.new(b"wrong-secret", body, hashlib.sha256).hexdigest()
        assert _verify_bkash_webhook(body, signature) is False

    def test_missing_secret_always_rejects(self, monkeypatch):
        monkeypatch.setattr(settings, "BKASH_APP_SECRET", "")
        body = b"payload"
        signature = hmac.new(b"anything", body, hashlib.sha256).hexdigest()
        assert _verify_bkash_webhook(body, signature) is False

    def test_empty_signature_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "BKASH_APP_SECRET", "test-secret")
        assert _verify_bkash_webhook(b"payload", "") is False


class TestNagadWebhookSignature:
    def _gateway(self, merchant_key: str) -> NagadGateway:
        gw = NagadGateway.__new__(NagadGateway)  # skip __init__'s settings read
        gw.merchant_key = merchant_key
        return gw

    def test_valid_signature_accepted(self):
        gw = self._gateway("merchant-key-123")
        payload = '{"orderId": "ORD1", "status": "Success"}'
        signature = hashlib.md5((payload + "merchant-key-123").encode()).hexdigest()
        assert gw.verify_webhook_signature(payload, signature) is True

    def test_tampered_payload_rejected(self):
        gw = self._gateway("merchant-key-123")
        payload = '{"orderId": "ORD1", "status": "Success"}'
        signature = hashlib.md5((payload + "merchant-key-123").encode()).hexdigest()
        assert gw.verify_webhook_signature('{"orderId": "ORD1", "status": "Failed"}', signature) is False

    def test_missing_merchant_key_rejects(self):
        gw = self._gateway("")
        assert gw.verify_webhook_signature("payload", "some-signature") is False

    def test_missing_signature_rejects(self):
        gw = self._gateway("merchant-key-123")
        assert gw.verify_webhook_signature("payload", "") is False
