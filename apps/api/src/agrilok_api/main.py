"""The FastAPI application: lifespan, middleware and error shape."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from agrilok_api import library
from agrilok_api.observability import (
    configure_logging,
    init_sentry,
    request_log,
    security_headers,
)
from agrilok_api.routes import router
from agrilok_core.gemini import GeminiError
from agrilok_core.runtime import Runtime, open_runtime
from agrilok_core.settings import Settings, get_settings

log = logging.getLogger("agrilok.api")


async def _check_models(runtime: Runtime) -> bool:
    """ADR-0008: confirm the configured model still exists. Returns True if it is missing.

    A retired model fails loudly and visibly: /v1/ready and /v1/meta say so,
    live answers report "unavailable", and nothing silently swaps in another
    model. Cached and pre-generated answers keep serving.
    """
    if not runtime.gemini.configured:
        log.warning("GEMINI_API_KEY is not set; live answers are off, cached ones still serve")
        return False
    model = runtime.settings.gemini_generation_model
    try:
        exists = await runtime.gemini.model_exists(model)
    except GeminiError as exc:
        log.warning("could not check model %s at startup: %s", model, exc.status)
        return False
    if not exists:
        log.error("configured generation model %s does not exist; live answers are off", model)
    return not exists


def create_app(settings: Settings | None = None, *, runtime: Runtime | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings)
    init_sentry(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        rt = runtime or await open_runtime(settings)
        app.state.runtime = rt
        async with rt.pool.connection() as conn:
            app.state.codes = await library.reference_codes(conn)
        app.state.model_missing = await _check_models(rt) if runtime is None else False
        try:
            yield
        finally:
            if runtime is None:
                await rt.close()

    app = FastAPI(
        title="agrilok API",
        version="0.1.0",
        description=(
            "Official Loksewa agriculture syllabi, and answers that come only from them. "
            "Every answer cites the government document it came from."
        ),
        lifespan=lifespan,
        docs_url="/docs" if settings.app_env != "production" else None,
        redoc_url=None,
    )
    app.middleware("http")(security_headers)
    app.middleware("http")(request_log)
    app.add_middleware(GZipMiddleware, minimum_size=800)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
        max_age=600,
    )

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            {"error": {"status": exc.status_code, "message": exc.detail}},
            status_code=exc.status_code,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [".".join(str(p) for p in e.get("loc", [])[1:]) for e in exc.errors()]
        return JSONResponse(
            {"error": {"status": 422, "message": "invalid request", "fields": fields}},
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unexpected(_: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled error", exc_info=exc)
        return JSONResponse(
            {"error": {"status": 500, "message": "something went wrong on our side"}},
            status_code=500,
        )

    app.include_router(router)
    return app


def __getattr__(name: str) -> FastAPI:
    # `uvicorn agrilok_api.main:app` builds the app on first access, so importing
    # this module (in tests, for instance) does not read settings or open a pool.
    if name == "app":
        return create_app()
    raise AttributeError(name)
