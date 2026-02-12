"""Secrets management abstraction layer."""

from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseSecretsBackend(ABC):
    """Abstract secrets backend."""

    @abstractmethod
    async def get_secret(self, key: str) -> str | None:
        ...

    @abstractmethod
    async def set_secret(self, key: str, value: str) -> None:
        ...

    @abstractmethod
    async def delete_secret(self, key: str) -> None:
        ...


class EnvSecretsBackend(BaseSecretsBackend):
    """Environment variable-based secrets (for development)."""

    async def get_secret(self, key: str) -> str | None:
        return os.environ.get(key)

    async def set_secret(self, key: str, value: str) -> None:
        os.environ[key] = value

    async def delete_secret(self, key: str) -> None:
        os.environ.pop(key, None)


class VaultSecretsBackend(BaseSecretsBackend):
    """HashiCorp Vault-based secrets backend (production)."""

    def __init__(self, vault_url: str, token: str, mount_path: str = "secret") -> None:
        self.vault_url = vault_url.rstrip("/")
        self.token = token
        self.mount_path = mount_path

    async def get_secret(self, key: str) -> str | None:
        import httpx

        url = f"{self.vault_url}/v1/{self.mount_path}/data/{key}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"X-Vault-Token": self.token})
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", {}).get("data", {}).get("value")
            return None

    async def set_secret(self, key: str, value: str) -> None:
        import httpx

        url = f"{self.vault_url}/v1/{self.mount_path}/data/{key}"
        async with httpx.AsyncClient() as client:
            await client.post(
                url,
                headers={"X-Vault-Token": self.token},
                json={"data": {"value": value}},
            )

    async def delete_secret(self, key: str) -> None:
        import httpx

        url = f"{self.vault_url}/v1/{self.mount_path}/metadata/{key}"
        async with httpx.AsyncClient() as client:
            await client.delete(url, headers={"X-Vault-Token": self.token})


class SecretsManager:
    """Unified secrets manager with backend abstraction."""

    def __init__(self, backend: BaseSecretsBackend | None = None) -> None:
        self._backend = backend or EnvSecretsBackend()
        self._cache: dict[str, str] = {}

    async def get(self, key: str, default: str = "") -> str:
        if key in self._cache:
            return self._cache[key]
        value = await self._backend.get_secret(key)
        if value is not None:
            self._cache[key] = value
            return value
        return default

    async def set(self, key: str, value: str) -> None:
        await self._backend.set_secret(key, value)
        self._cache[key] = value

    async def delete(self, key: str) -> None:
        await self._backend.delete_secret(key)
        self._cache.pop(key, None)

    def clear_cache(self) -> None:
        self._cache.clear()
