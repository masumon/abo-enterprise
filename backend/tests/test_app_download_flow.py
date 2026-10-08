"""End-to-end flow of the public Apon download against an in-memory database and a fake
upstream file server: info -> captcha -> ticket -> streamed file, caps and resume."""
import os

os.environ.setdefault("SECRET_KEY", "k" * 48)

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.api.v1.routes import app_download as route
from app.core.database import get_db
from app.main import app
from app.models.models import AppDownloadEvent, AppRelease, Setting

PAYLOAD = bytes(range(256)) * 400  # 102,400 bytes, recognisable content
SOURCE = "https://github.com/masumon/abo-enterprise/releases/download/apon-v1.0.0/Apon-1.0.0.apk"


def _upstream(request: httpx.Request) -> httpx.Response:
    rng = request.headers.get("range")
    if rng:
        start, _, end = rng.replace("bytes=", "").partition("-")
        start, end = int(start), int(end) if end else len(PAYLOAD) - 1
        body = PAYLOAD[start : end + 1]
        return httpx.Response(206, stream=httpx.ByteStream(body), headers={"Content-Range": f"bytes {start}-{end}/{len(PAYLOAD)}", "Content-Length": str(len(body))})
    return httpx.Response(200, stream=httpx.ByteStream(PAYLOAD), headers={"Content-Length": str(len(PAYLOAD))})


class _HttpxShim:
    Timeout = httpx.Timeout

    @staticmethod
    def AsyncClient(**kw):
        return httpx.AsyncClient(transport=httpx.MockTransport(_upstream), **kw)


@pytest_asyncio.fixture
async def env(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        for model in (Setting, AppRelease, AppDownloadEvent):
            await conn.run_sync(model.__table__.create)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def override():
        async with Session() as s:
            yield s

    app.dependency_overrides[get_db] = override
    monkeypatch.setattr(route, "httpx", _HttpxShim)
    route._stream_slots = __import__("asyncio").Semaphore(3)
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    yield client, Session
    await client.aclose()
    app.dependency_overrides.clear()
    await engine.dispose()


async def _seed(Session, *, enabled=True, extra=None, publish=True):
    async with Session() as s:
        for k, v in {"apon_enabled": "true" if enabled else "false", **(extra or {})}.items():
            s.add(Setting(key=k, value=v))
        s.add(AppRelease(version_name="1.0.0", version_code=45, file_name="Apon-1.0.0.apk", source_url=SOURCE,
                         size_bytes=len(PAYLOAD), sha256="ab" * 32, status="published" if publish else "draft", is_current=publish))
        await s.commit()


def _solve(c):
    return c["a"] + c["b"] if c["op"] == "+" else c["a"] - c["b"]


async def _ticket(client, answer=None, token=None):
    c = (await client.get("/api/v1/app/captcha")).json()["data"]
    return await client.post("/api/v1/app/download-ticket", json={"token": token or c["token"], "answer": str(_solve(c) if answer is None else answer)}), c


@pytest.mark.asyncio
async def test_hidden_until_enabled_and_never_leaks_the_source(env):
    client, Session = env
    assert (await client.get("/api/v1/app/info")).json()["data"]["enabled"] is False
    await _seed(Session)
    data = (await client.get("/api/v1/app/info")).json()["data"]
    assert data["enabled"] is True and data["release"]["version_name"] == "1.0.0"
    assert "github" not in str(data).lower() and "source_url" not in str(data)


@pytest.mark.asyncio
async def test_unpublished_build_is_not_downloadable(env):
    client, Session = env
    await _seed(Session, publish=False)
    assert (await client.get("/api/v1/app/info")).json()["data"]["enabled"] is False
    r, _ = await _ticket(client)
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_captcha_is_required_and_honeypot_blocks_bots(env):
    client, Session = env
    await _seed(Session)
    wrong, c = await _ticket(client, answer=999)
    assert wrong.status_code == 400 and wrong.json()["detail"] == "captcha_failed"
    bot = await client.post("/api/v1/app/download-ticket", json={"token": c["token"], "answer": str(_solve(c)), "website": "http://spam"})
    assert bot.status_code == 400


@pytest.mark.asyncio
async def test_full_download_is_served_from_our_own_url_and_counted(env):
    client, Session = env
    await _seed(Session)
    r, _ = await _ticket(client)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["url"].startswith("/api/v1/app/file/") and "github" not in data["url"].lower()
    f = await client.get(data["url"])
    assert f.status_code == 200 and f.content == PAYLOAD
    assert f.headers["content-type"] == "application/vnd.android.package-archive"
    assert 'filename="Apon-1.0.0.apk"' in f.headers["content-disposition"]
    assert f.headers["content-length"] == str(len(PAYLOAD)) and f.headers["cache-control"] == "no-store"
    assert "github" not in str(dict(f.headers)).lower()
    async with Session() as s:
        assert len((await s.execute(select(AppDownloadEvent))).scalars().all()) == 1
        assert (await s.execute(select(AppRelease.download_count))).scalar_one() == 1
        ev = (await s.execute(select(AppDownloadEvent))).scalar_one()
        assert ev.ip_hash and "127.0.0.1" not in ev.ip_hash


@pytest.mark.asyncio
async def test_interrupted_download_can_resume_without_double_counting(env):
    client, Session = env
    await _seed(Session)
    url = (await _ticket(client))[0].json()["data"]["url"]
    part = await client.get(url, headers={"Range": "bytes=1000-1999"})
    assert part.status_code == 206 and part.content == PAYLOAD[1000:2000]
    assert part.headers["content-range"] == f"bytes 1000-1999/{len(PAYLOAD)}"
    async with Session() as s:
        assert (await s.execute(select(AppRelease.download_count))).scalar_one() == 0  # resume is not a new download


@pytest.mark.asyncio
async def test_bad_or_reused_ticket_is_refused(env):
    client, Session = env
    await _seed(Session)
    assert (await client.get("/api/v1/app/file/not-a-ticket/Apon.apk")).status_code == 403
    url = (await _ticket(client))[0].json()["data"]["url"]
    for _ in range(route_max := 6):
        await client.get(url, headers={"Range": "bytes=0-9"})
    assert (await client.get(url)).status_code == 403  # ticket used up


@pytest.mark.asyncio
async def test_per_visitor_daily_limit(env):
    client, Session = env
    await _seed(Session, extra={"apon_daily_limit_per_ip": "1"})
    url = (await _ticket(client))[0].json()["data"]["url"]
    assert (await client.get(url)).status_code == 200
    again, _ = await _ticket(client)
    assert again.status_code == 429 and again.json()["detail"] == "daily_limit"


@pytest.mark.asyncio
async def test_monthly_cap_protects_the_free_server(env):
    client, Session = env
    await _seed(Session, extra={"apon_monthly_cap": "1", "apon_daily_limit_per_ip": "0"})
    url = (await _ticket(client))[0].json()["data"]["url"]
    assert (await client.get(url)).status_code == 200
    capped, _ = await _ticket(client)
    assert capped.status_code == 503 and capped.json()["detail"] == "monthly_limit"


@pytest.mark.asyncio
async def test_captcha_can_be_switched_off_by_the_admin(env):
    client, Session = env
    await _seed(Session, extra={"apon_captcha_enabled": "false"})
    r = await client.post("/api/v1/app/download-ticket", json={"token": "", "answer": ""})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_a_disallowed_source_is_never_fetched(env):
    client, Session = env
    await _seed(Session)
    async with Session() as s:
        rel = (await s.execute(select(AppRelease))).scalar_one()
        rel.source_url = "https://169.254.169.254/latest/meta-data"
        await s.commit()
    url = (await _ticket(client))[0].json()["data"]["url"]
    assert (await client.get(url)).status_code == 404


@pytest.mark.asyncio
async def test_admin_endpoints_need_a_login(env):
    client, _ = env
    for method, path in (("GET", "/api/v1/app/admin/releases"), ("POST", "/api/v1/app/admin/inspect"), ("GET", "/api/v1/app/admin/stats")):
        r = await client.request(method, path, json={"url": SOURCE} if method == "POST" else None)
        assert r.status_code in (401, 403), (path, r.status_code)
