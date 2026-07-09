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


def parse_google_error(exc: Exception) -> dict:
    """Extract a human-actionable reason from a failed GA4 API call."""
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        try:
            err = exc.response.json().get("error", {})
            message = err.get("message") or str(exc)
        except Exception:
            message = str(exc)
        hints = {
            400: "The request was rejected — usually a wrong GA4_PROPERTY_ID (must be the numeric property id).",
            401: "Authentication failed — check GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY.",
            403: "Permission denied — add the service-account email as a Viewer on the GA4 property.",
            404: "Property not found — check GA4_PROPERTY_ID.",
            429: "Google Analytics API quota exceeded — try again later.",
        }
        return {
            "ok": False,
            "status_code": status,
            "error": message,
            "hint": hints.get(status, "See the Google error message above."),
        }
    return {"ok": False, "status_code": None, "error": str(exc), "hint": "Network or configuration error."}


def validate_config_format() -> dict | None:
    """Catch the classic env-var format mistakes before touching the network.

    These are by far the most common reasons a "fully configured" GA4
    integration returns no data, and Google's own errors for them are cryptic.
    """
    pid = str(settings.GA4_PROPERTY_ID or "").strip()
    email = str(settings.GA4_CLIENT_EMAIL or "").strip()
    key = str(settings.GA4_PRIVATE_KEY or "").strip()

    if pid.upper().startswith("G-"):
        return {
            "error": f"GA4_PROPERTY_ID is set to a Measurement ID ({pid}).",
            "hint": "Use the NUMERIC Property ID instead — GA4 Admin → Property → Property details (e.g. 987654321). The G-… value belongs only in the frontend tag.",
        }
    if not pid.isdigit():
        return {
            "error": f"GA4_PROPERTY_ID must be numeric, got: {pid[:24]}",
            "hint": "Copy the numeric Property ID from GA4 Admin → Property details.",
        }
    if "@" not in email or not email.endswith(".iam.gserviceaccount.com"):
        return {
            "error": "GA4_CLIENT_EMAIL does not look like a service-account email.",
            "hint": "It must end with .iam.gserviceaccount.com (from the Google Cloud service-account JSON, field client_email).",
        }
    if key.startswith("{"):
        return {
            "error": "GA4_PRIVATE_KEY contains the whole JSON key file.",
            "hint": "Paste ONLY the private_key field value (starts with -----BEGIN PRIVATE KEY-----), not the entire JSON.",
        }
    if "BEGIN PRIVATE KEY" not in key and "BEGIN RSA PRIVATE KEY" not in key:
        return {
            "error": "GA4_PRIVATE_KEY is not a PEM private key.",
            "hint": "Copy the private_key value from the service-account JSON, including the BEGIN/END lines. Literal \\n escapes are fine.",
        }
    return None


async def check_connection() -> dict:
    """Live end-to-end GA4 connection test (bypasses all caches).

    Authenticates with the service account and runs a minimal real report,
    so the result proves whether genuine data is flowing — and if not, why.
    """
    if not is_configured():
        return {
            "ok": False,
            "configured": False,
            "error": "GA4 environment variables are not set.",
            "hint": "Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY.",
        }
    format_problem = validate_config_format()
    if format_problem:
        return {"ok": False, "configured": True, "status_code": None, **format_problem}
    prop = f"properties/{settings.GA4_PROPERTY_ID}"
    started = time.time()
    try:
        async with httpx.AsyncClient() as client:
            token = await _access_token(client)
            headers = {"Authorization": f"Bearer {token}"}
            r = await client.post(
                f"{_API}/{prop}:runReport",
                json=_req(["activeUsers", "screenPageViews"], days=7, limit=1),
                headers=headers,
                timeout=15,
            )
            r.raise_for_status()
            row = (_rows(r.json()) or [{}])[0]
        pid = str(settings.GA4_PROPERTY_ID)
        return {
            "ok": True,
            "configured": True,
            "property_id_masked": f"{pid[:3]}…{pid[-2:]}" if len(pid) > 5 else pid,
            "active_users_7d": int(row.get("activeUsers", 0) or 0),
            "page_views_7d": int(row.get("screenPageViews", 0) or 0),
            "latency_ms": int((time.time() - started) * 1000),
        }
    except Exception as exc:  # noqa: BLE001 — diagnostics must never raise
        logger.warning("GA4 connection check failed", exc_info=True)
        return {"configured": True, **parse_google_error(exc)}


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

        # IMPORTANT: the GA4 Realtime API supports only a small dimension set
        # (country, city, deviceCategory, unifiedScreenName, minutesAgo,
        # platform, eventName, ...). pagePath / browser / sessionSource are
        # NOT among them — requesting those returned 400s that were silently
        # swallowed, which is why the live panels went permanently blank
        # after they were added.
        totals_rows = await safe_realtime(
            {"metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}, {"name": "eventCount"}]},
            essential=True,
        )

        pages_rows = await safe_realtime(
            {
                "dimensions": [{"name": "unifiedScreenName"}],
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
        platforms = await safe_realtime(
            {
                "dimensions": [{"name": "platform"}],
                "metrics": [{"name": "activeUsers"}],
                "limit": "6",
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

    totals = totals_rows[0] if totals_rows else {}
    active_pages = [
        # Realtime reports pages by screen name (page title), not URL path.
        {"pagePath": r.get("unifiedScreenName", ""), "activeUsers": int(r.get("activeUsers", 0) or 0)}
        for r in pages_rows
    ]
    payload = {
        "active_users": int(totals.get("activeUsers", 0) or 0),
        "page_views_30min": int(totals.get("screenPageViews", 0) or 0),
        "events_30min": int(totals.get("eventCount", 0) or 0),
        "active_pages": active_pages,
        # kept for payload compatibility — realtime has no URL-path dimension,
        # so per-catalog live lists cannot be derived any more
        "active_products": [],
        "active_services": [],
        "countries": countries,
        "cities": cities,
        "devices": devices,
        "platforms": platforms,
        "browsers": [],
        "traffic_sources": [],
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
        # NOTE: no "exits" request — the GA4 Data API has no exits metric, and
        # one invalid request 400s the whole batchRunReports call, which used
        # to silently blank Landing Pages as collateral damage.
        batch3 = [
            _req(["screenPageViews"], ["pagePath"], days=days, limit=8,
                 order_metric="screenPageViews", dim_filter=_path_filter("/products/")),
            _req(["screenPageViews"], ["pagePath"], days=days, limit=8,
                 order_metric="screenPageViews", dim_filter=_path_filter("/services/")),
            _req(["screenPageViews"], ["pagePath"], days=days, limit=1,
                 dim_filter=_path_filter("/contact")),
            _req(["sessions"], ["landingPage"], days=days, limit=10,
                 order_metric="sessions"),
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
            # landingPage is unavailable on some properties; retry without it
            # so products/services/contact reports still come through.
            logger.warning("GA4 optional batch failed; retrying without landingPage", exc_info=True)
            reports3 = await _run_batch(client, prop, headers, batch3[:3])
            reports3.append({})

        try:
            live = await fetch_live_analytics()
        except Exception:
            logger.warning("GA4 live payload unavailable; continuing with historical only", exc_info=True)
            live = {
                "active_users": 0,
                "page_views_30min": 0,
                "events_30min": 0,
                "active_pages": [],
                "active_products": [],
                "active_services": [],
                "countries": [],
                "cities": [],
                "devices": [],
                "platforms": [],
                "browsers": [],
                "traffic_sources": [],
                "timeline": [],
                "refreshed_at": int(time.time()),
                "cache_ttl_seconds": _LIVE_CACHE_TTL,
            }

    totals = (_rows(reports1[0]) or [{}])[0]
    daily = sorted(_rows(reports1[1]), key=lambda r: r.get("date", ""))
    landing_pages = _rows(reports3[3]) if len(reports3) > 3 else []
    # GA4 has no exits metric; key kept empty for payload compatibility.
    exit_pages: list[dict] = []

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
