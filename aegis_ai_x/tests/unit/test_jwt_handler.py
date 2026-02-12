"""Unit tests for the JWT handler."""

import pytest
from unittest.mock import patch
from datetime import timedelta

from services.auth.jwt_handler import JWTHandler


class TestJWTHandler:
    def setup_method(self):
        self.handler = JWTHandler()

    def test_create_access_token(self):
        token = self.handler.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="developer",
        )
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_valid_token(self):
        token = self.handler.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="developer",
        )
        payload = self.handler.verify_token(token)
        assert payload["sub"] == "user-123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "developer"

    def test_create_refresh_token(self):
        token = self.handler.create_refresh_token(user_id="user-123")
        payload = self.handler.verify_token(token)
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_create_token_pair(self):
        pair = self.handler.create_token_pair("user-123", "test@example.com", "admin")
        assert pair.access_token
        assert pair.refresh_token
        assert pair.token_type == "bearer"
        assert pair.expires_in > 0

    def test_expired_token_rejected(self):
        token = self.handler.create_access_token(
            user_id="user-123",
            email="test@example.com",
            role="developer",
            expires_delta=timedelta(seconds=-1),
        )
        with pytest.raises(ValueError, match="Invalid token"):
            self.handler.verify_token(token)

    def test_invalid_token_rejected(self):
        with pytest.raises(ValueError, match="Invalid token"):
            self.handler.verify_token("completely.invalid.token")

    def test_get_user_id_from_token(self):
        token = self.handler.create_access_token(
            user_id="user-456",
            email="test@example.com",
            role="viewer",
        )
        user_id = self.handler.get_user_id_from_token(token)
        assert user_id == "user-456"
