"""Structured logs and optional error reporting, with nothing personal in either.

Log lines carry the method, the route template, the status and the time taken.
Never the query string, never a question, never an IP address
(docs/privacy.md: "Never log a full question body together with an account
identifier").
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response

from agrilok_core.settings import Settings

log = logging.getLogger("agrilok.api")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
        }
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            entry.update(extra)
        if record.exc_info:
            entry["error"] = self.formatException(record.exc_info).splitlines()[-1]
        return json.dumps(entry, ensure_ascii=False)


def configure_logging(settings: Settings) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())
    # httpx logs full request URLs at info; the Gemini URL has no key in it, but
    # there is nothing in those lines worth keeping.
    logging.getLogger("httpx").setLevel(logging.WARNING)


def init_sentry(settings: Settings) -> bool:
    if settings.sentry_dsn is None:
        return False
    try:
        import sentry_sdk
    except ImportError:
        log.warning("SENTRY_DSN is set but sentry-sdk is not installed (extra: observability)")
        return False

    def scrub(event: Any, _hint: dict[str, Any]) -> Any:
        request = event.get("request") or {}
        for key in ("data", "cookies", "headers", "query_string", "env"):
            request.pop(key, None)
        event.pop("user", None)
        return event

    sentry_sdk.init(
        dsn=settings.sentry_dsn.get_secret_value(),
        environment=settings.app_env,
        send_default_pii=False,
        traces_sample_rate=0.0,
        before_send=scrub,
    )
    return True


async def request_log(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    started = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["x-request-id"] = request_id
        return response
    finally:
        route = request.scope.get("route")
        path = getattr(route, "path", None) or "unmatched"
        log.info(
            "request",
            extra={
                "fields": {
                    "request_id": request_id,
                    "method": request.method,
                    "route": path,
                    "status": status,
                    "ms": round((time.perf_counter() - started) * 1000),
                }
            },
        )


async def security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    response.headers.setdefault("x-content-type-options", "nosniff")
    response.headers.setdefault("referrer-policy", "no-referrer")
    response.headers.setdefault("x-frame-options", "DENY")
    response.headers.setdefault("cross-origin-resource-policy", "same-site")
    response.headers.setdefault("cache-control", "no-store")
    return response
