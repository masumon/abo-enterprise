"""GA4 Data API client — powers the admin Visitor Analytics tab.

Free-tier friendly: no google-* SDKs. The service-account access token is
minted with python-jose (RS256, already a dependency) and reports are
fetched over httpx. Responses are cached in-memory for a few minutes so
the GA quota and Render dyno both stay comfortable.

Configuration (all optional — the feature degrades gracefully):
  GA4_PROPERTY_ID      numeric GA4 property id, e.g. 987654321
  GA4_CLIENT_EMAIL     service-account email with Viewer access on the property
  GA4_PRIVATE_KEY      the service-account PEM private key ("\\n" escapes OK)
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from jose import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"
_API = "https://analyticsdata.googleapis.com/v1beta"

_token_cache: dict[str, Any] = {"token": None, "exp": 0.0}
_report_cache: dict[str, tuple[float, dict]] = {}
_CACHE_TTL = 300  # 5 min — matches GA4's own processing latency
_LIVE_CACHE_TTL = 15  # 10–30s live refresh window with quota protection


def is_configured() -> bool:
    return bool(
        settings.GA4_PROPERTY_ID and settings.GA4_CLIENT_EMAIL and settings.GA4_PRIVATE_KEY
    )


def _private_key() -> str:
    # Render env vars store newlines as literal \n
    return settings.GA4_PRIVATE_KEY.replace("\\n", "\n")


async def _access_token(client: httpx.AsyncClient) -> str:
    now = time.time()
    if _token_cache["token"] and now < _token_cache["exp"] - 60:
        return _token_cache["token"]
    assertion = jwt.encode(
        {
            "iss": settings.GA4_CLIENT_EMAIL,
            "scope": _SCOPE,
            "aud": _TOKEN_URL,
            "iat": int(now),
            "exp": int(now) + 3600,
        },
        _private_key(),
        algorithm="RS256",
    )
    r = await client.post(
        _TOKEN_URL,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    _token_cache["token"] = data["access_token"]
    _token_cache["exp"] = now + int(data.get("expires_in", 3600))
    return _token_cache["token"]


def _rows(report: dict) -> list[dict]:
    """Flatten one GA4 report into [{dim..., met...}] dicts."""
    dims = [d["name"] for d in report.get("dimensionHeaders", [])]
    mets = [m["name"] for m in report.get("metricHeaders", [])]
    out = []
    for row in report.get("rows", []):
        item: dict[str, Any] = {}
        for i, d in enumerate(dims):
            item[d] = row.get("dimensionValues", [])[i].get("value", "")
        for i, m in enumerate(mets):
            raw = row.get("metricValues", [])[i].get("value", "0")
            try:
                item[m] = float(raw) if "." in raw else int(raw)
            except ValueError:
                item[m] = raw
        out.append(item)
    return out


def _req(metrics: list[str], dimensions: list[str] | None = None, *,
         days: int, limit: int = 10, order_metric: str | None = None,
         dim_filter: dict | None = None) -> dict:
    body: dict[str, Any] = {
        "dateRanges": [{"startDate": f"{days}daysAgo", "endDate": "today"}],
        "metrics": [{"name": m} for m in metrics],
        "limit": str(limit),
    }
    if dimensions:
        body["dimensions"] = [{"name": d} for d in dimensions]
    if order_metric:
        body["orderBys"] = [{"metric": {"metricName": order_metric}, "desc": True}]
    if dim_filter:
        body["dimensionFilter"] = dim_filter
    return body


def _path_filter(prefix: str) -> dict:
    return {
        "filter": {
            "fieldName": "pagePath",
            "stringFilter": {"matchType": "BEGINS_WITH", "value": prefix},
        }
    }


def _sum_metric(rows: list[dict], metric: str) -> int:
    return int(sum(int(r.get(metric, 0) or 0) for r in rows))


def _safe_hour(v: Any) -> int:
    try:
        return int(v)
    except Exception:
        return 0


async def _run_batch(
    client: httpx.AsyncClient,
    prop: str,
    headers: dict[str, str],
    requests: list[dict],
    *,
    timeout: int = 25,
) -> list[dict]:
    r = await client.post(
        f"{_API}/{prop}:batchRunReports",
        json={"requests": requests}, headers=headers, timeout=timeout,
    )
    r.raise_for_status()
    return r.json().get("reports", [])


async def _run_realtime(
    client: httpx.AsyncClient,
    prop: str,
    headers: dict[str, str],
    body: dict,
    *,
    timeout: int = 15,
) -> list[dict]:
    r = await client.post(
        f"{_API}/{prop}:runRealtimeReport",
        json=body,
        headers=headers,
        timeout=timeout,
    )
    r.raise_for_status()
    return _rows(r.json())


async def fetch_live_analytics() -> dict:
    """Dedicated GA4 realtime analytics payload for 10–30s dashboard refresh."""
    cache_key = "visitors:live"
    now = time.time()
    hit = _report_cache.get(cache_key)
    if hit and now - hit[0] < _LIVE_CACHE_TTL:
        return hit[1]

    prop = f"properties/{settings.GA4_PROPERTY_ID}"
    async with httpx.AsyncClient() as client:
        token = await _access_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        async def safe_realtime(body: dict, *, essential: bool = False) -> list[dict]:
            try:
                return await _run_realtime(client, prop, headers, body)
            except Exception:
                if essential:
                    raise
                logger.warning("GA4 optional realtime report failed", exc_info=True)
                return []

        totals_rows = await safe_realtime({"metrics": [{"name": "activeUsers"}]}, essential=True)

        pages_rows = await safe_realtime(
            {
                "dimensions": [{"name": "pagePath"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "20",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )

        countries = await safe_realtime(
            {
                "dimensions": [{"name": "country"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "10",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )
        cities = await safe_realtime(
            {
                "dimensions": [{"name": "city"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "10",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )
        devices = await safe_realtime(
            {
                "dimensions": [{"name": "deviceCategory"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "6",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )
        browsers = await safe_realtime(
            {
                "dimensions": [{"name": "browser"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "8",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )
        traffic_sources = await safe_realtime(
            {
                "dimensions": [{"name": "sessionSource"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "10",
                "orderBys": [{"metric": {"metricName": "activeUsers"}, "desc": True}],
            },
        )
        timeline = await safe_realtime(
            {
                "dimensions": [{"name": "minutesAgo"}],
                "metrics": [{"name": "activeUsers"}],
                "minuteRanges": [{"startMinutesAgo": 29, "endMinutesAgo": 0, "name": "last30"}],
                "limit": "30",
            },
        )

    active_pages = [
        {"pagePath": r.get("pagePath", ""), "activeUsers": int(r.get("activeUsers", 0) or 0)}
        for r in pages_rows
    ]
    payload = {
        "active_users": int(totals_rows[0].get("activeUsers", 0)) if totals_rows else 0,
        "active_pages": active_pages,
        "active_products": [r for r in active_pages if str(r.get("pagePath", "")).startswith("/products/")][:10],
        "active_services": [r for r in active_pages if str(r.get("pagePath", "")).startswith("/services/")][:10],
        "countries": countries,
        "cities": cities,
        "devices": devices,
        "browsers": browsers,
        "traffic_sources": traffic_sources,
        "timeline": sorted(
            [
                {
                    "minutesAgo": int(r.get("minutesAgo", 0) or 0),
                    "activeUsers": int(r.get("activeUsers", 0) or 0),
                }
                for r in timeline
            ],
            key=lambda x: x["minutesAgo"],
        ),
        "refreshed_at": int(now),
        "cache_ttl_seconds": _LIVE_CACHE_TTL,
    }
    _report_cache[cache_key] = (now, payload)
    return payload


async def fetch_visitor_analytics(days: int = 30) -> dict:
    """Compose the full Visitor Analytics payload (batched: 3 HTTP calls)."""
    cache_key = f"visitors:{days}"
    now = time.time()
    hit = _report_cache.get(cache_key)
    if hit and now - hit[0] < _CACHE_TTL:
        return hit[1]

    prop = f"properties/{settings.GA4_PROPERTY_ID}"
    async with httpx.AsyncClient() as client:
        token = await _access_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        batch1 = [
            _req(["activeUsers", "newUsers", "sessions", "engagedSessions", "screenPageViews",
                  "averageSessionDuration", "bounceRate", "engagementRate"], days=days, limit=1),
            _req(["activeUsers"], ["date"], days=days, limit=400),
            _req(["sessions"], ["sessionDefaultChannelGroup"], days=days,
                 limit=10, order_metric="sessions"),
            _req(["screenPageViews", "activeUsers"], ["pagePath"], days=days,
                 limit=10, order_metric="screenPageViews"),
            _req(["activeUsers"], ["deviceCategory"], days=days, limit=5,
                 order_metric="activeUsers"),
        ]
        batch2 = [
            _req(["activeUsers"], ["browser"], days=days, limit=6,
                 order_metric="activeUsers"),
            _req(["activeUsers"], ["operatingSystem"], days=days, limit=8,
                 order_metric="activeUsers"),
            _req(["activeUsers"], ["country"], days=days, limit=10,
                 order_metric="activeUsers"),
            _req(["activeUsers"], ["city"], days=days, limit=10,
                 order_metric="activeUsers"),
            _req(["activeUsers"], ["newVsReturning"], days=days, limit=3),
            _req(["activeUsers"], ["hour"], days=days, limit=24),
        ]
        batch3 = [
            _req(["screenPageViews"], ["pagePath"], days=days, limit=8,
                 order_metric="screenPageViews", dim_filter=_path_filter("/products/")),
            _req(["screenPageViews"], ["pagePath"], days=days, limit=8,
                 order_metric="screenPageViews", dim_filter=_path_filter("/services/")),
            _req(["screenPageViews"], ["pagePath"], days=days, limit=1,
                 dim_filter=_path_filter("/contact")),
            _req(["sessions"], ["landingPage"], days=days, limit=10,
                 order_metric="sessions"),
            _req(["exits"], ["pagePath"], days=days, limit=10,
                 order_metric="exits"),
        ]

        try:
            reports1 = await _run_batch(client, prop, headers, batch1)
        except Exception:
            # Some properties can reject newer engagement metrics.
            logger.warning("GA4 primary batch failed; retrying with legacy metrics", exc_info=True)
            batch1_legacy = [
                _req(["activeUsers", "newUsers", "sessions", "screenPageViews",
                      "averageSessionDuration", "bounceRate"], days=days, limit=1),
                _req(["activeUsers"], ["date"], days=days, limit=400),
                _req(["sessions"], ["sessionDefaultChannelGroup"], days=days,
                     limit=10, order_metric="sessions"),
                _req(["screenPageViews", "activeUsers"], ["pagePath"], days=days,
                     limit=10, order_metric="screenPageViews"),
                _req(["activeUsers"], ["deviceCategory"], days=days, limit=5,
                     order_metric="activeUsers"),
            ]
            reports1 = await _run_batch(client, prop, headers, batch1_legacy)

        try:
            reports2 = await _run_batch(client, prop, headers, batch2)
        except Exception:
            # operatingSystem can fail on some properties; keep other dimensions available.
            logger.warning("GA4 secondary batch failed; retrying with compatible dimensions", exc_info=True)
            batch2_legacy = [
                _req(["activeUsers"], ["browser"], days=days, limit=6,
                     order_metric="activeUsers"),
                _req(["activeUsers"], ["country"], days=days, limit=10,
                     order_metric="activeUsers"),
                _req(["activeUsers"], ["city"], days=days, limit=10,
                     order_metric="activeUsers"),
                _req(["activeUsers"], ["newVsReturning"], days=days, limit=3),
                _req(["activeUsers"], ["hour"], days=days, limit=24),
            ]
            reports2_legacy = await _run_batch(client, prop, headers, batch2_legacy)
            # Keep the same shape as batch2 indexes expected below.
            reports2 = [
                reports2_legacy[0] if len(reports2_legacy) > 0 else {},  # browser
                {},  # operatingSystem unavailable
                reports2_legacy[1] if len(reports2_legacy) > 1 else {},  # country
                reports2_legacy[2] if len(reports2_legacy) > 2 else {},  # city
                reports2_legacy[3] if len(reports2_legacy) > 3 else {},  # newVsReturning
                reports2_legacy[4] if len(reports2_legacy) > 4 else {},  # hour
            ]
        reports3: list[dict] = []
        try:
            reports3 = await _run_batch(client, prop, headers, batch3)
        except Exception:
            # Some properties do not expose optional dimensions/metrics (landing/exit pages).
            # Fall back to legacy, guaranteed-compatible requests.
            logger.warning("GA4 optional batch failed; retrying with fallback reports", exc_info=True)
            fallback3 = batch3[:3]
            reports3 = await _run_batch(client, prop, headers, fallback3)
            reports3.extend([{}, {}])

        try:
            live = await fetch_live_analytics()
        except Exception:
            logger.warning("GA4 live payload unavailable; continuing with historical only", exc_info=True)
            live = {
                "active_users": 0,
                "active_pages": [],
                "active_products": [],
                "active_services": [],
                "countries": [],
                "cities": [],
                "devices": [],
                "browsers": [],
                "traffic_sources": [],
                "timeline": [],
                "refreshed_at": int(time.time()),
                "cache_ttl_seconds": _LIVE_CACHE_TTL,
            }

    totals = (_rows(reports1[0]) or [{}])[0]
    daily = sorted(_rows(reports1[1]), key=lambda r: r.get("date", ""))
    landing_pages = _rows(reports3[3]) if len(reports3) > 3 else []
    exit_pages = _rows(reports3[4]) if len(reports3) > 4 else []

    users = int(totals.get("activeUsers", 0) or 0)
    sessions = int(totals.get("sessions", 0) or 0)
    engaged_sessions = int(totals.get("engagedSessions", 0) or 0)
    page_views = int(totals.get("screenPageViews", 0) or 0)
    conversion_rate = round((engaged_sessions / sessions * 100) if sessions > 0 else 0, 1)

    historical = {
        "users": users,
        "new_users": int(totals.get("newUsers", 0) or 0),
        "sessions": sessions,
        "engaged_sessions": engaged_sessions,
        "avg_session_duration_sec": round(float(totals.get("averageSessionDuration", 0) or 0)),
        "bounce_rate_pct": round(float(totals.get("bounceRate", 0) or 0) * 100, 1),
        "engagement_rate_pct": round(float(totals.get("engagementRate", 0) or 0) * 100, 1),
        "page_views": page_views,
        "top_pages": _rows(reports1[3]),
        "landing_pages": landing_pages,
        "exit_pages": exit_pages,
        "traffic_sources": _rows(reports1[2]),
        "channels": _rows(reports1[2]),
        "devices": _rows(reports1[4]),
        "browsers": _rows(reports2[0]),
        "operating_systems": _rows(reports2[1]),
        "countries": _rows(reports2[2]),
        "cities": _rows(reports2[3]),
        "peak_hours": sorted(_rows(reports2[5]), key=lambda r: _safe_hour(r.get("hour"))),
        "top_products": _rows(reports3[0]),
        "top_services": _rows(reports3[1]),
        "contact_views": int((_rows(reports3[2]) or [{}])[0].get("screenPageViews", 0) or 0),
        "lead_generation": int((_rows(reports3[2]) or [{}])[0].get("screenPageViews", 0) or 0),
        "order_funnel": {
            "sessions": sessions,
            "engaged_sessions": engaged_sessions,
            "product_page_views": _sum_metric(_rows(reports3[0]), "screenPageViews"),
            "service_page_views": _sum_metric(_rows(reports3[1]), "screenPageViews"),
        },
        "conversion_rate_pct": conversion_rate,
        "revenue": None,
    }

    payload = {
        "configured": True,
        "days": days,
        "live": live,
        "historical": historical,
        "realtime_active_users": int(live.get("active_users", 0) or 0),
        "totals": {
            "visitors": users,
            "new_visitors": historical["new_users"],
            "sessions": sessions,
            "engaged_sessions": engaged_sessions,
            "engagement_rate_pct": historical["engagement_rate_pct"],
            "page_views": page_views,
            "avg_session_duration_sec": historical["avg_session_duration_sec"],
            "bounce_rate_pct": historical["bounce_rate_pct"],
        },
        "daily": [{"date": r["date"], "visitors": r["activeUsers"]} for r in daily],
        "traffic_sources": historical["traffic_sources"],
        "top_pages": historical["top_pages"],
        "landing_pages": historical["landing_pages"],
        "exit_pages": historical["exit_pages"],
        "devices": historical["devices"],
        "browsers": historical["browsers"],
        "operating_systems": historical["operating_systems"],
        "countries": historical["countries"],
        "cities": historical["cities"],
        "new_vs_returning": _rows(reports2[4]),
        "peak_hours": historical["peak_hours"],
        "top_products": historical["top_products"],
        "top_services": historical["top_services"],
        "contact_page_views": historical["contact_views"],
        "lead_generation": historical["lead_generation"],
        "conversion_rate_pct": historical["conversion_rate_pct"],
        "order_funnel": historical["order_funnel"],
    }
    _report_cache[cache_key] = (now, payload)
    return payload
