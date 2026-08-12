"""Pure crypto coverage for the bKash/Nagad/SSLCommerz payment-webhook
signature checks (payments.py, core/nagad.py, core/sslcommerz.py) — no
live database or network call involved. These gate whether an inbound
"payment succeeded" webhook is trusted, so a broken comparison here is a
real-money bug.
"""
import hashlib
import hmac
from urllib.parse import urlencode

from app.api.v1.routes.payments import _verify_bkash_webhook
from app.core.config import settings
from app.core.nagad import NagadGateway
from app.core.sslcommerz import SSLCommerzGateway


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


class TestSSLCommerzWebhookSignature:
    def _gateway(self, store_id: str = "store1", store_password: str = "pw-secret") -> SSLCommerzGateway:
        gw = SSLCommerzGateway.__new__(SSLCommerzGateway)  # skip __init__'s settings read
        gw.store_id = store_id
        gw.store_password = store_password
        return gw

    def _signed_ipn(self, gw: SSLCommerzGateway, **fields: str) -> dict:
        verify_key = ",".join(fields.keys())
        data = {**fields, "store_passwd": gw.store_password}
        sign_str = urlencode(sorted(data.items()))
        verify_sign = hashlib.md5(sign_str.encode()).hexdigest()
        return {**fields, "verify_key": verify_key, "verify_sign": verify_sign}

    def test_valid_signature_accepted(self):
        gw = self._gateway()
        post_data = self._signed_ipn(gw, tran_id="ORD-1", status="VALID", amount="500.00")
        assert gw.verify_ipn(post_data) is True

    def test_tampered_field_rejected(self):
        gw = self._gateway()
        post_data = self._signed_ipn(gw, tran_id="ORD-1", status="VALID", amount="500.00")
        post_data["status"] = "FAILED"  # tampered after signing
        assert gw.verify_ipn(post_data) is False

    def test_wrong_store_password_rejected(self):
        signer = self._gateway(store_password="real-secret")
        post_data = self._signed_ipn(signer, tran_id="ORD-1", status="VALID")
        verifier = self._gateway(store_password="wrong-secret")
        assert verifier.verify_ipn(post_data) is False

    def test_missing_verify_fields_rejected(self):
        gw = self._gateway()
        assert gw.verify_ipn({"tran_id": "ORD-1", "status": "VALID"}) is False

    def test_not_configured_rejects(self):
        gw = self._gateway(store_id="", store_password="")
        post_data = self._signed_ipn(gw, tran_id="ORD-1", status="VALID")
        assert gw.verify_ipn(post_data) is False
