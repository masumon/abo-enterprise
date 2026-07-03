"""Lightweight ETag/If-None-Match handling for public GET endpoints.

Optimised for Render free tier: pure-python, no cache backend, no
extra memory. The digest depends only on the response payload, so it's
stable across replicas and safe when the process restarts.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import Request, Response
from fastapi.responses import JSONResponse


def _serialise(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True, default=str, separators=(",", ":")).encode("utf-8")


def make_etag(payload: Any) -> str:
    return 'W/"' + hashlib.sha256(_serialise(payload)).hexdigest()[:16] + '"'


def etag_json_response(
    request: Request,
    payload: dict[str, Any],
    *,
    max_age: int = 60,
) -> Response:
    """Return a JSONResponse with an ETag, or 304 when the client already has it.

    `max_age` seconds are set as Cache-Control public + must-revalidate, so
    intermediaries and browsers can serve the last body when the origin says 304.
    """
    etag = make_etag(payload)
    inm = request.headers.get("if-none-match")
    if inm and etag in [t.strip() for t in inm.split(",")]:
        return Response(
            status_code=304,
            headers={"ETag": etag, "Cache-Control": f"public, max-age={max_age}, must-revalidate"},
        )
    return JSONResponse(
        payload,
        headers={"ETag": etag, "Cache-Control": f"public, max-age={max_age}, must-revalidate"},
    )
