"""OAuth2 provider integrations (GitHub, Google)."""

from __future__ import annotations

from dataclasses import dataclass

import httpx

from libs.config import get_settings


@dataclass
class OAuthUserInfo:
    provider: str
    provider_id: str
    email: str
    name: str
    avatar_url: str = ""


class GitHubOAuth:
    """GitHub OAuth2 integration."""

    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_API_URL = "https://api.github.com/user"

    def __init__(self) -> None:
        settings = get_settings()
        self.client_id = settings.oauth_github_client_id
        self.client_secret = settings.oauth_github_client_secret

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        """Generate the GitHub OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTHORIZE_URL}?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> str:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Fetch user profile from GitHub API."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.USER_API_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

            # Get primary email
            email = data.get("email", "")
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get("primary")), None)
                email = primary["email"] if primary else emails[0]["email"]

            return OAuthUserInfo(
                provider="github",
                provider_id=str(data["id"]),
                email=email,
                name=data.get("name", data.get("login", "")),
                avatar_url=data.get("avatar_url", ""),
            )


class GoogleOAuth:
    """Google OAuth2 integration."""

    AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USER_API_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(self) -> None:
        settings = get_settings()
        self.client_id = settings.oauth_google_client_id
        self.client_secret = settings.oauth_google_client_secret

    def get_authorize_url(self, redirect_uri: str, state: str) -> str:
        """Generate the Google OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTHORIZE_URL}?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> str:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["access_token"]

    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Fetch user profile from Google API."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                self.USER_API_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

            return OAuthUserInfo(
                provider="google",
                provider_id=data["id"],
                email=data["email"],
                name=data.get("name", ""),
                avatar_url=data.get("picture", ""),
            )
