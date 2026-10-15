"""Backup destinations ("drives").

Every provider gets the least access its API allows:
  google_drive — OAuth scope ``drive.file``: only files this app created
  onedrive     — ``Files.ReadWrite.AppFolder``: only Apps/<app name> folder
  dropbox      — "App folder" app type: only Apps/<app name>
  s3           — any S3-compatible bucket (Cloudflare R2, Backblaze B2, Wasabi,
                 AWS S3, iDrive e2, MinIO) with a bucket-scoped key
  webdav       — Nextcloud/ownCloud, pCloud, Koofr, Yandex, NAS… (app password)

No provider ever creates a share/public link. Files are already encrypted
(.abobak) before they get here.
"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import ipaddress
import json
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable
from urllib.parse import quote, unquote, urlencode, urlsplit

import httpx

FILE_PREFIX = "abo-db-"
TIMEOUT = httpx.Timeout(60.0, read=600.0, write=600.0)
FOLDER_NAME = "ABO Backups"


class ProviderError(Exception):
    def __init__(self, message: str, message_bn: str | None = None):
        super().__init__(message)
        self.message_bn = message_bn or message


SaveFn = Callable[[dict[str, Any], dict[str, Any]], Awaitable[None]]  # (cfg_updates, secret_updates)


async def _file_chunks(path: Path, size: int = 1 << 20) -> AsyncIterator[bytes]:
    with open(path, "rb") as f:
        while chunk := f.read(size):
            yield chunk


def _raise_for(r: httpx.Response, what: str) -> None:
    if r.status_code < 400:
        return
    detail = r.text[:300]
    if r.status_code in (401, 403):
        raise ProviderError(f"{what}: access denied ({r.status_code}) {detail}",
                            "ড্রাইভ অনুমতি দিচ্ছে না — সংযোগটি আবার করুন (Reconnect)।")
    if r.status_code == 507 or "quota" in detail.lower() or "insufficient" in detail.lower():
        raise ProviderError(f"{what}: storage full {detail}", "ড্রাইভে জায়গা শেষ — পুরোনো ফাইল মুছুন বা অন্য ড্রাইভ দিন।")
    raise ProviderError(f"{what}: HTTP {r.status_code} {detail}", f"ড্রাইভ ত্রুটি ({r.status_code}) — একটু পরে আবার চেষ্টা করুন।")


def check_public_https(url: str) -> str:
    """User-entered endpoints must be https and not point inside the server's network."""
    parts = urlsplit((url or "").strip())
    if parts.scheme != "https" or not parts.hostname:
        raise ProviderError("endpoint must be https://", "ঠিকানা অবশ্যই https:// দিয়ে শুরু হতে হবে।")
    host = parts.hostname.lower()
    if host in ("localhost",) or host.endswith(".local") or host.endswith(".internal"):
        raise ProviderError("internal hosts are not allowed", "এই ঠিকানা ব্যবহার করা যাবে না।")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return url.strip().rstrip("/")
    if not ip.is_global:
        raise ProviderError("private addresses are not allowed", "এই ঠিকানা ব্যবহার করা যাবে না।")
    return url.strip().rstrip("/")


class Provider:
    kind = ""
    oauth = False

    def __init__(self, cfg: dict[str, Any], secret: dict[str, Any], save: SaveFn | None = None):
        self.cfg, self.secret, self._save = cfg, secret, save
        self._token: tuple[str, float] | None = None

    async def save(self, cfg: dict[str, Any] | None = None, secret: dict[str, Any] | None = None) -> None:
        if cfg:
            self.cfg.update(cfg)
        if secret:
            self.secret.update(secret)
        if self._save:
            await self._save(cfg or {}, secret or {})

    # interface
    async def check(self) -> str: ...
    async def upload(self, path: Path, name: str) -> dict[str, Any]: ...
    async def download(self, file_id: str, dest: Path) -> None: ...
    async def delete(self, file_id: str) -> None: ...
    async def list(self) -> list[dict[str, Any]]: ...

    async def _stream_to(self, client: httpx.AsyncClient, method: str, url: str, dest: Path, what: str, **kw) -> None:
        async with client.stream(method, url, **kw) as r:
            if r.status_code >= 400:
                await r.aread()
                _raise_for(r, what)
            with open(dest, "wb") as f:
                async for chunk in r.aiter_bytes(1 << 16):
                    f.write(chunk)


# ── OAuth (Google / Microsoft / Dropbox) ─────────────────────────────────────

OAUTH: dict[str, dict[str, str]] = {
    "google_drive": {
        "auth": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "scope": "https://www.googleapis.com/auth/drive.file openid email",
    },
    "onedrive": {
        "auth": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "scope": "offline_access Files.ReadWrite.AppFolder User.Read",
    },
    "dropbox": {
        "auth": "https://www.dropbox.com/oauth2/authorize",
        "token": "https://api.dropboxapi.com/oauth2/token",
        "scope": "",
    },
}


def pkce_pair() -> tuple[str, str]:
    import secrets as _s

    verifier = _s.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def authorize_url(kind: str, client_id: str, redirect_uri: str, state: str, challenge: str) -> str:
    o = OAUTH[kind]
    q = {"client_id": client_id, "redirect_uri": redirect_uri, "response_type": "code", "state": state,
         "code_challenge": challenge, "code_challenge_method": "S256"}
    if kind == "google_drive":
        q.update(scope=o["scope"], access_type="offline", prompt="consent")
    elif kind == "onedrive":
        q.update(scope=o["scope"], response_mode="query", prompt="select_account")
    else:
        q.update(token_access_type="offline")
    return f"{o['auth']}?{urlencode(q)}"


async def exchange_code(kind: str, client_id: str, client_secret: str, code: str, redirect_uri: str,
                        verifier: str) -> dict[str, Any]:
    data = {"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri, "client_id": client_id,
            "client_secret": client_secret, "code_verifier": verifier}
    if kind == "onedrive":
        data["scope"] = OAUTH[kind]["scope"]
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(OAUTH[kind]["token"], data=data)
    if r.status_code >= 400:
        raise ProviderError(f"token exchange failed: {r.text[:300]}",
                            "অনুমতি নেওয়া যায়নি — Client ID/Secret ও Redirect URI ঠিক আছে কি না দেখুন।")
    tok = r.json()
    if not tok.get("refresh_token"):
        raise ProviderError("no refresh token returned",
                            "ড্রাইভ স্থায়ী অনুমতি (refresh token) দেয়নি — আবার সংযোগ করুন ও সব অনুমতি দিন।")
    return tok


class _OAuthProvider(Provider):
    oauth = True

    async def access_token(self) -> str:
        if self._token and self._token[1] > time.time() + 60:
            return self._token[0]
        data = {"grant_type": "refresh_token", "refresh_token": self.secret.get("refresh_token", ""),
                "client_id": self.secret.get("client_id", ""), "client_secret": self.secret.get("client_secret", "")}
        if self.kind == "onedrive":
            data["scope"] = OAUTH["onedrive"]["scope"]
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(OAUTH[self.kind]["token"], data=data)
        if r.status_code >= 400:
            raise ProviderError(f"token refresh failed: {r.text[:300]}",
                                "ড্রাইভের অনুমতি শেষ হয়ে গেছে বা বাতিল হয়েছে — সংযোগটি আবার করুন (Reconnect)।")
        tok = r.json()
        self._token = (tok["access_token"], time.time() + int(tok.get("expires_in", 3600)))
        if tok.get("refresh_token") and tok["refresh_token"] != self.secret.get("refresh_token"):
            await self.save(secret={"refresh_token": tok["refresh_token"]})  # Microsoft rotates refresh tokens
        return self._token[0]

    async def _h(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        return {"Authorization": f"Bearer {await self.access_token()}", **(extra or {})}


class GoogleDrive(_OAuthProvider):
    kind = "google_drive"
    API = "https://www.googleapis.com/drive/v3"

    async def check(self) -> str:
        await self._folder()
        return self.cfg.get("account", "Google Drive")

    async def _folder(self) -> str:
        if self.cfg.get("folder_id"):
            return self.cfg["folder_id"]
        q = f"name='{FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{self.API}/files", params={"q": q, "fields": "files(id)", "spaces": "drive"},
                            headers=await self._h())
            _raise_for(r, "find folder")
            files = r.json().get("files", [])
            if files:
                fid = files[0]["id"]
            else:
                r = await c.post(f"{self.API}/files", json={"name": FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"},
                                 headers=await self._h())
                _raise_for(r, "create folder")
                fid = r.json()["id"]
        await self.save(cfg={"folder_id": fid})
        return fid

    async def upload(self, path: Path, name: str) -> dict[str, Any]:
        folder, size = await self._folder(), path.stat().st_size
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post("https://www.googleapis.com/upload/drive/v3/files",
                             params={"uploadType": "resumable", "fields": "id,size"},
                             json={"name": name, "parents": [folder]},
                             headers=await self._h({"X-Upload-Content-Type": "application/octet-stream",
                                                    "X-Upload-Content-Length": str(size)}))
            _raise_for(r, "start upload")
            r = await c.put(r.headers["Location"], content=_file_chunks(path),
                            headers={"Content-Length": str(size), "Content-Type": "application/octet-stream"})
            _raise_for(r, "upload")
            j = r.json()
        return {"id": j["id"], "size": int(j.get("size") or size)}

    async def download(self, file_id: str, dest: Path) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
            await self._stream_to(c, "GET", f"{self.API}/files/{file_id}", dest, "download",
                                  params={"alt": "media"}, headers=await self._h())

    async def delete(self, file_id: str) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.delete(f"{self.API}/files/{file_id}", headers=await self._h())
            if r.status_code != 404:
                _raise_for(r, "delete")

    async def list(self) -> list[dict[str, Any]]:
        folder, out, token = await self._folder(), [], None
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            while True:
                params = {"q": f"'{folder}' in parents and trashed=false", "pageSize": "1000",
                          "fields": "nextPageToken,files(id,name,size,createdTime)"}
                if token:
                    params["pageToken"] = token
                r = await c.get(f"{self.API}/files", params=params, headers=await self._h())
                _raise_for(r, "list")
                j = r.json()
                out += [{"id": f["id"], "name": f["name"], "size": int(f.get("size") or 0)} for f in j.get("files", [])]
                token = j.get("nextPageToken")
                if not token:
                    break
        return [f for f in out if f["name"].startswith(FILE_PREFIX)]


class OneDrive(_OAuthProvider):
    kind = "onedrive"
    API = "https://graph.microsoft.com/v1.0"
    CHUNK = 320 * 1024 * 16  # must be a multiple of 320 KiB

    async def check(self) -> str:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.get(f"{self.API}/me/drive/special/approot", headers=await self._h())
            _raise_for(r, "app folder")
        return self.cfg.get("account", "OneDrive")

    async def upload(self, path: Path, name: str) -> dict[str, Any]:
        size = path.stat().st_size
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(f"{self.API}/me/drive/special/approot:/{quote(name)}:/createUploadSession",
                             json={"item": {"@microsoft.graph.conflictBehavior": "replace"}}, headers=await self._h())
            _raise_for(r, "start upload")
            url = r.json()["uploadUrl"]
            j: dict[str, Any] = {}
            with open(path, "rb") as f:
                start = 0
                while start < size or (size == 0 and start == 0):
                    data = f.read(self.CHUNK)
                    end = start + len(data) - 1
                    r = await c.put(url, content=data, headers={"Content-Length": str(len(data)),
                                                                "Content-Range": f"bytes {start}-{end}/{size}"})
                    _raise_for(r, "upload")
                    if r.status_code in (200, 201):
                        j = r.json()
                    start = end + 1
                    if size == 0:
                        break
        if not j.get("id"):
            raise ProviderError("upload did not finish", "আপলোড শেষ হয়নি — আবার চেষ্টা করুন।")
        return {"id": j["id"], "size": int(j.get("size") or size)}

    async def download(self, file_id: str, dest: Path) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
            await self._stream_to(c, "GET", f"{self.API}/me/drive/items/{file_id}/content", dest, "download",
                                  headers=await self._h())

    async def delete(self, file_id: str) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.delete(f"{self.API}/me/drive/items/{file_id}", headers=await self._h())
            if r.status_code != 404:
                _raise_for(r, "delete")

    async def list(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        url: str | None = f"{self.API}/me/drive/special/approot/children?$select=id,name,size&$top=999"
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            while url:
                r = await c.get(url, headers=await self._h())
                _raise_for(r, "list")
                j = r.json()
                out += [{"id": f["id"], "name": f["name"], "size": int(f.get("size") or 0)} for f in j.get("value", [])]
                url = j.get("@odata.nextLink")
        return [f for f in out if f["name"].startswith(FILE_PREFIX)]


class Dropbox(_OAuthProvider):
    kind = "dropbox"
    API = "https://api.dropboxapi.com/2"
    CONTENT = "https://content.dropboxapi.com/2"
    SINGLE_MAX = 140 * 1024 * 1024
    CHUNK = 8 * 1024 * 1024

    async def check(self) -> str:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(f"{self.API}/files/list_folder", json={"path": "", "limit": 1}, headers=await self._h())
            _raise_for(r, "list")
        return self.cfg.get("account", "Dropbox")

    def _arg(self, d: dict) -> dict[str, str]:
        # Dropbox-API-Arg must be ASCII JSON
        return {"Dropbox-API-Arg": json.dumps(d, ensure_ascii=True), "Content-Type": "application/octet-stream"}

    async def upload(self, path: Path, name: str) -> dict[str, Any]:
        size = path.stat().st_size
        commit = {"path": f"/{name}", "mode": "overwrite", "mute": True}
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            if size <= self.SINGLE_MAX:
                r = await c.post(f"{self.CONTENT}/files/upload", content=_file_chunks(path),
                                 headers=await self._h({**self._arg(commit), "Content-Length": str(size)}))
                _raise_for(r, "upload")
                j = r.json()
            else:
                with open(path, "rb") as f:
                    r = await c.post(f"{self.CONTENT}/files/upload_session/start", content=f.read(self.CHUNK),
                                     headers=await self._h(self._arg({"close": False})))
                    _raise_for(r, "upload start")
                    sid, off = r.json()["session_id"], f.tell()
                    while off < size:
                        data = f.read(self.CHUNK)
                        if f.tell() >= size:
                            r = await c.post(f"{self.CONTENT}/files/upload_session/finish", content=data,
                                             headers=await self._h(self._arg({"cursor": {"session_id": sid, "offset": off},
                                                                              "commit": commit})))
                            _raise_for(r, "upload finish")
                            j = r.json()
                            break
                        r = await c.post(f"{self.CONTENT}/files/upload_session/append_v2", content=data,
                                         headers=await self._h(self._arg({"cursor": {"session_id": sid, "offset": off},
                                                                          "close": False})))
                        _raise_for(r, "upload part")
                        off = f.tell()
        return {"id": j["id"], "size": int(j.get("size") or size)}

    async def download(self, file_id: str, dest: Path) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            await self._stream_to(c, "POST", f"{self.CONTENT}/files/download", dest, "download",
                                  headers=await self._h({"Dropbox-API-Arg": json.dumps({"path": file_id})}))

    async def delete(self, file_id: str) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(f"{self.API}/files/delete_v2", json={"path": file_id}, headers=await self._h())
            if r.status_code != 409:  # 409 = already gone
                _raise_for(r, "delete")

    async def list(self) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.post(f"{self.API}/files/list_folder", json={"path": ""}, headers=await self._h())
            while True:
                _raise_for(r, "list")
                j = r.json()
                out += [{"id": e["id"], "name": e["name"], "size": int(e.get("size") or 0)}
                        for e in j.get("entries", []) if e.get(".tag") == "file"]
                if not j.get("has_more"):
                    break
                r = await c.post(f"{self.API}/files/list_folder/continue", json={"cursor": j["cursor"]},
                                 headers=await self._h())
        return [f for f in out if f["name"].startswith(FILE_PREFIX)]


# ── S3-compatible (SigV4) ─────────────────────────────────────────────────────

def _hmac(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def sigv4_headers(method: str, url: str, region: str, access_key: str, secret_key: str, payload_hash: str,
                  headers: dict[str, str] | None = None, now: dt.datetime | None = None) -> dict[str, str]:
    """AWS Signature Version 4 for service "s3". Returns the headers to send."""
    now = now or dt.datetime.now(dt.timezone.utc)
    amz_date, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    parts = urlsplit(url)
    host = parts.netloc
    hdrs = {k.lower(): str(v).strip() for k, v in (headers or {}).items()}
    hdrs.update({"host": host, "x-amz-date": amz_date, "x-amz-content-sha256": payload_hash})
    canon_path = quote(unquote(parts.path or "/"), safe="/-_.~")
    qs = sorted((quote(unquote(k), safe="-_.~"), quote(unquote(v), safe="-_.~"))
                for k, _, v in (p.partition("=") for p in parts.query.split("&") if p))
    canon_query = "&".join(f"{k}={v}" for k, v in qs)
    signed = sorted(hdrs)
    canon_headers = "".join(f"{k}:{hdrs[k]}\n" for k in signed)
    signed_headers = ";".join(signed)
    creq = "\n".join([method, canon_path, canon_query, canon_headers, signed_headers, payload_hash])
    scope = f"{day}/{region}/s3/aws4_request"
    sts = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(creq.encode()).hexdigest()])
    key = _hmac(_hmac(_hmac(_hmac(f"AWS4{secret_key}".encode(), day), region), "s3"), "aws4_request")
    sig = hmac.new(key, sts.encode(), hashlib.sha256).hexdigest()
    out = {k: v for k, v in hdrs.items() if k != "host"}
    out["Authorization"] = (f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, "
                            f"SignedHeaders={signed_headers}, Signature={sig}")
    return out


_EMPTY = hashlib.sha256(b"").hexdigest()


class S3(Provider):
    kind = "s3"

    def _base(self) -> str:
        return f"{check_public_https(self.cfg.get('endpoint', ''))}/{quote(self.cfg.get('bucket', ''))}"

    def _key(self, name: str) -> str:
        prefix = (self.cfg.get("prefix") or "abo-backups/").strip("/")
        return f"{prefix}/{name}" if prefix else name

    def _sign(self, method: str, url: str, payload_hash: str = _EMPTY, headers: dict | None = None) -> dict[str, str]:
        return sigv4_headers(method, url, self.cfg.get("region") or "auto", self.secret.get("access_key", ""),
                             self.secret.get("secret_key", ""), payload_hash, headers)

    async def check(self) -> str:
        await self._list(max_keys=1)
        return f"{self.cfg.get('bucket')} ({urlsplit(self.cfg.get('endpoint', '')).hostname})"

    async def upload(self, path: Path, name: str) -> dict[str, Any]:
        size = path.stat().st_size
        h = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(1 << 20):
                h.update(chunk)
        key = self._key(name)
        url = f"{self._base()}/{quote(key)}"
        extra = {"content-type": "application/octet-stream", "content-length": str(size)}
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.put(url, content=_file_chunks(path), headers=self._sign("PUT", url, h.hexdigest(), extra))
            _raise_for(r, "upload")
        return {"id": key, "size": size}

    async def download(self, file_id: str, dest: Path) -> None:
        url = f"{self._base()}/{quote(file_id)}"
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            await self._stream_to(c, "GET", url, dest, "download", headers=self._sign("GET", url))

    async def delete(self, file_id: str) -> None:
        url = f"{self._base()}/{quote(file_id)}"
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.delete(url, headers=self._sign("DELETE", url))
            if r.status_code != 404:
                _raise_for(r, "delete")

    async def _list(self, max_keys: int = 1000) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        token = None
        prefix = self._key(FILE_PREFIX)
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            while True:
                q = {"list-type": "2", "max-keys": str(max_keys), "prefix": prefix}
                if token:
                    q["continuation-token"] = token
                url = f"{self._base()}?{urlencode(sorted(q.items()), quote_via=quote)}"
                r = await c.get(url, headers=self._sign("GET", url))
                _raise_for(r, "list")
                root = ET.fromstring(r.content)
                ns = root.tag.split("}")[0] + "}" if root.tag.startswith("{") else ""
                for el in root.findall(f"{ns}Contents"):
                    key = el.findtext(f"{ns}Key") or ""
                    out.append({"id": key, "name": key.rsplit("/", 1)[-1], "size": int(el.findtext(f"{ns}Size") or 0)})
                token = root.findtext(f"{ns}NextContinuationToken")
                if not token or max_keys == 1:
                    break
        return out

    async def list(self) -> list[dict[str, Any]]:
        return [f for f in await self._list() if f["name"].startswith(FILE_PREFIX)]


# ── WebDAV ────────────────────────────────────────────────────────────────────

class WebDAV(Provider):
    kind = "webdav"

    def _dir(self) -> str:
        base = check_public_https(self.cfg.get("url", ""))
        folder = (self.cfg.get("folder") or "ABO-Backups").strip("/")
        return f"{base}/{quote(folder)}"

    def _auth(self) -> httpx.BasicAuth:
        return httpx.BasicAuth(self.cfg.get("username", ""), self.secret.get("password", ""))

    async def _ensure_dir(self, c: httpx.AsyncClient) -> None:
        r = await c.request("MKCOL", self._dir() + "/", auth=self._auth())
        if r.status_code not in (201, 405, 301, 302):  # 405 = already exists
            _raise_for(r, "create folder")

    async def check(self) -> str:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            await self._ensure_dir(c)
        return f"{self.cfg.get('username')} @ {urlsplit(self.cfg.get('url', '')).hostname}"

    async def upload(self, path: Path, name: str) -> dict[str, Any]:
        size = path.stat().st_size
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            await self._ensure_dir(c)
            r = await c.put(f"{self._dir()}/{quote(name)}", content=_file_chunks(path), auth=self._auth(),
                            headers={"Content-Length": str(size), "Content-Type": "application/octet-stream"})
            _raise_for(r, "upload")
        return {"id": name, "size": size}

    async def download(self, file_id: str, dest: Path) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
            await self._stream_to(c, "GET", f"{self._dir()}/{quote(file_id)}", dest, "download", auth=self._auth())

    async def delete(self, file_id: str) -> None:
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.delete(f"{self._dir()}/{quote(file_id)}", auth=self._auth())
            if r.status_code != 404:
                _raise_for(r, "delete")

    async def list(self) -> list[dict[str, Any]]:
        body = ('<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/>'
                '</d:prop></d:propfind>')
        async with httpx.AsyncClient(timeout=TIMEOUT) as c:
            r = await c.request("PROPFIND", self._dir() + "/", content=body, auth=self._auth(),
                                headers={"Depth": "1", "Content-Type": "application/xml"})
            if r.status_code == 404:
                return []
            _raise_for(r, "list")
        out = []
        for resp in ET.fromstring(r.content).iter("{DAV:}response"):
            href = unquote(resp.findtext("{DAV:}href") or "").rstrip("/")
            name = href.rsplit("/", 1)[-1]
            size = resp.find(".//{DAV:}getcontentlength")
            if name.startswith(FILE_PREFIX):
                out.append({"id": name, "name": name, "size": int(size.text) if size is not None and size.text else 0})
        return out


KINDS: dict[str, type[Provider]] = {
    "google_drive": GoogleDrive, "onedrive": OneDrive, "dropbox": Dropbox, "s3": S3, "webdav": WebDAV,
}


def make(kind: str, cfg: dict[str, Any], secret: dict[str, Any], save: SaveFn | None = None) -> Provider:
    if kind not in KINDS:
        raise ProviderError(f"unknown drive type {kind}", "এই ধরনের ড্রাইভ সমর্থিত নয়।")
    return KINDS[kind](cfg, secret, save)


def account_from_tokens(kind: str, tok: dict[str, Any]) -> str:
    """Best-effort account label (email) for display only."""
    if kind == "google_drive" and tok.get("id_token"):
        try:
            payload = tok["id_token"].split(".")[1]
            payload += "=" * (-len(payload) % 4)
            return json.loads(base64.urlsafe_b64decode(payload)).get("email", "")
        except (ValueError, IndexError):
            return ""
    return ""


async def fetch_account(kind: str, access_token: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            if kind == "onedrive":
                r = await c.get("https://graph.microsoft.com/v1.0/me", headers={"Authorization": f"Bearer {access_token}"})
                j = r.json() if r.status_code < 400 else {}
                return j.get("mail") or j.get("userPrincipalName") or ""
            if kind == "dropbox":
                r = await c.post("https://api.dropboxapi.com/2/users/get_current_account",
                                 headers={"Authorization": f"Bearer {access_token}"})
                return (r.json() if r.status_code < 400 else {}).get("email", "")
    except (httpx.HTTPError, ValueError):
        return ""
    return ""
