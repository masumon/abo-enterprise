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
        batch2 = [
            _req(["activeUsers"], ["browser"], days=days, limit=6,
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
        ]

        async def run_batch(requests: list[dict]) -> list[dict]:
            r = await client.post(
                f"{_API}/{prop}:batchRunReports",
                json={"requests": requests}, headers=headers, timeout=25,
            )
            r.raise_for_status()
            return r.json().get("reports", [])

        reports1 = await run_batch(batch1)
        reports2 = await run_batch(batch2)
        reports3 = await run_batch(batch3)

        rt = await client.post(
            f"{_API}/{prop}:runRealtimeReport",
            json={"metrics": [{"name": "activeUsers"}]},
            headers=headers, timeout=15,
        )
        rt.raise_for_status()
        rt_rows = _rows(rt.json())

    totals = (_rows(reports1[0]) or [{}])[0]
    daily = sorted(_rows(reports1[1]), key=lambda r: r.get("date", ""))
    payload = {
        "configured": True,
        "days": days,
        "realtime_active_users": int(rt_rows[0].get("activeUsers", 0)) if rt_rows else 0,
        "totals": {
            "visitors": totals.get("activeUsers", 0),
            "new_visitors": totals.get("newUsers", 0),
            "sessions": totals.get("sessions", 0),
            "page_views": totals.get("screenPageViews", 0),
            "avg_session_duration_sec": round(float(totals.get("averageSessionDuration", 0))),
            "bounce_rate_pct": round(float(totals.get("bounceRate", 0)) * 100, 1),
        },
        "daily": [{"date": r["date"], "visitors": r["activeUsers"]} for r in daily],
        "traffic_sources": _rows(reports1[2]),
        "top_pages": _rows(reports1[3]),
        "devices": _rows(reports1[4]),
        "browsers": _rows(reports2[0]),
        "countries": _rows(reports2[1]),
        "cities": _rows(reports2[2]),
        "new_vs_returning": _rows(reports2[3]),
        "peak_hours": sorted(_rows(reports2[4]), key=lambda r: int(r.get("hour", 0) or 0)),
        "top_products": _rows(reports3[0]),
        "top_services": _rows(reports3[1]),
        "contact_page_views": (_rows(reports3[2]) or [{}])[0].get("screenPageViews", 0),
    }
    _report_cache[cache_key] = (now, payload)
    return payload
