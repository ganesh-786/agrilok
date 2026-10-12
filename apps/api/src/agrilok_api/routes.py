"""HTTP routes. Level is part of every path that returns study content, never a query option."""

from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse

from agrilok_api import library
from agrilok_api.clients import RateLimiter, client_key
from agrilok_api.schemas import (
    AskRequest,
    AskResponse,
    CacheInfo,
    Citation,
    CommonQuestion,
    Consulted,
    DocumentDetail,
    LevelLibrary,
    LiveStatus,
    Meta,
    Reason,
    Review,
    SearchResults,
    StageTiming,
    Status,
)
from agrilok_core import metrics, quota
from agrilok_core.citations import display_quote
from agrilok_core.dates import nepal_date
from agrilok_core.levels import ExamLevel
from agrilok_core.pipeline import AskResult, InvalidQuestionError, Stage, ask, get_answer
from agrilok_core.runtime import Runtime

router = APIRouter(prefix="/v1")

# Ask is the only route that can spend quota. Search and the library are free.
ASK_LIMITS = RateLimiter([(8, 60.0), (80, 86_400.0)])
SEARCH_LIMITS = RateLimiter([(60, 60.0)])

PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600"


def _runtime(request: Request) -> Runtime:
    runtime: Runtime = request.app.state.runtime
    return runtime


def _limit(request: Request, limiter: RateLimiter) -> None:
    runtime = _runtime(request)
    token = runtime.settings.api_internal_token
    key = client_key(request, token.get_secret_value() if token else None)
    wait = limiter.hit(key)
    if wait is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests; please wait a moment.",
            headers={"retry-after": str(int(wait))},
        )


def _check_scope(request: Request, province: str | None, group: str | None) -> None:
    codes: dict[str, set[str]] = request.app.state.codes
    if province is not None and province not in codes["provinces"]:
        raise HTTPException(status_code=422, detail=f"unknown province {province!r}")
    if group is not None and group not in codes["service_groups"]:
        raise HTTPException(status_code=422, detail=f"unknown service group {group!r}")


async def _live_status(request: Request) -> LiveStatus:
    runtime = _runtime(request)
    settings = runtime.settings
    async with runtime.pool.connection() as conn:
        today = await quota.status(conn, "generate", settings.gemini_max_requests_per_day)
    reason: Literal["ok", "not_configured", "quota", "model_missing"]
    if not runtime.gemini.configured:
        reason = "not_configured"
    elif request.app.state.model_missing:
        reason = "model_missing"
    elif not today.available:
        reason = "quota"
    else:
        reason = "ok"
    return LiveStatus(
        configured=runtime.gemini.configured,
        available=reason == "ok",
        reason=reason,
        used_today=today.used,
        limit_today=today.limit,
        resets_at=today.resets_at,
    )


@router.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", include_in_schema=False)
async def ready(request: Request) -> JSONResponse:
    runtime = _runtime(request)
    checks: dict[str, Any] = {}
    try:
        async with runtime.pool.connection() as conn:
            cur = await conn.execute("select count(*) as n from schema_migrations")
            row = await cur.fetchone()
            checks["migrations"] = int(row["n"]) if row else 0
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unreachable"
    checks["model"] = (
        "missing"
        if request.app.state.model_missing
        else "configured"
        if runtime.gemini.configured
        else "not_configured"
    )
    ok = checks["database"] == "ok"
    return JSONResponse({"ready": ok, **checks}, status_code=200 if ok else 503)


@router.get("/meta", response_model=Meta)
async def meta(request: Request, response: Response) -> Meta:
    runtime = _runtime(request)
    async with runtime.pool.connection() as conn:
        levels, provinces, groups = await library.labels(conn)
        stats = await library.stats(conn)
    response.headers["cache-control"] = "public, max-age=60"
    return Meta(
        levels=levels,
        provinces=provinces,
        service_groups=groups,
        library=stats,
        live=await _live_status(request),
    )


@router.get("/levels/{level}/documents", response_model=LevelLibrary)
async def level_documents(
    request: Request,
    response: Response,
    level: ExamLevel,
    province: Annotated[str | None, Query(max_length=40)] = None,
    group: Annotated[str | None, Query(max_length=60)] = None,
) -> LevelLibrary:
    _check_scope(request, province, group)
    async with _runtime(request).pool.connection() as conn:
        syllabi, reference = await library.level_documents(conn, level, province, group)
    response.headers["cache-control"] = PUBLIC_CACHE
    return LevelLibrary(level=level.value, syllabi=syllabi, reference=reference)


@router.get("/documents/{doc_id}", response_model=DocumentDetail)
async def document(request: Request, response: Response, doc_id: str) -> DocumentDetail:
    async with _runtime(request).pool.connection() as conn:
        detail = await library.document_detail(conn, doc_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="no such document")
    response.headers["cache-control"] = PUBLIC_CACHE
    return detail


@router.get("/levels/{level}/search", response_model=SearchResults)
async def search(
    request: Request,
    level: ExamLevel,
    q: Annotated[str, Query(min_length=2, max_length=200)],
    province: Annotated[str | None, Query(max_length=40)] = None,
    group: Annotated[str | None, Query(max_length=60)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> SearchResults:
    _check_scope(request, province, group)
    _limit(request, SEARCH_LIMITS)
    async with _runtime(request).pool.connection() as conn:
        terms, hits = await library.search(conn, level, q, province, group, limit)
    return SearchResults(level=level.value, query=q, terms=terms, hits=hits)


@router.get("/levels/{level}/common-questions", response_model=list[CommonQuestion])
async def common_questions(
    request: Request, response: Response, level: ExamLevel
) -> list[CommonQuestion]:
    async with _runtime(request).pool.connection() as conn:
        rows = await library.common_questions(conn, level)
    response.headers["cache-control"] = "public, max-age=120"
    return [
        CommonQuestion(
            id=r["id"],
            question=r["question"],
            province=r["province"],
            served_count=r["served_count"],
            review=Review(
                state=r["review_state"],
                reviewed_by=r["reviewed_by"],
                reviewed_at=r["reviewed_at"],
                self_review=r["self_review"],
            ),
        )
        for r in rows
    ]


_UNAVAILABLE = {Stage.QUOTA, Stage.UNAVAILABLE, Stage.MODEL_ERROR}


def _to_date(value: object) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime | date):
        return nepal_date(value)
    return date.fromisoformat(str(value))


def to_response(result: AskResult) -> AskResponse:
    status: str
    if result.status == "answered":
        status = "answered"
    elif result.stage in _UNAVAILABLE:
        status = "unavailable"
    else:
        status = "refused"
    reason = None
    if result.stage is not None:
        detail = result.detail
        if result.stage is Stage.PERSONAL_DATA:
            detail = ", ".join(result.personal_data)
        reason = Reason(code=result.stage.value, detail=detail)
    citations = [
        Citation(
            n=c["n"],
            chunk_id=c["chunk_id"],
            document_id=c["document_id"],
            document_title=c.get("document_title") or c["document_id"],
            authority=c.get("authority"),
            doc_class=c.get("doc_class"),
            doc_type=c.get("doc_type"),
            exam_level=c.get("exam_level"),
            province=c.get("province"),
            section_heading=c.get("section_heading"),
            # Cleaned again here so answers cached before the cleanup read well too.
            quotes=[display_quote(q) for q in c.get("quotes") or []],
            resolvable_url=c.get("resolvable_url") or "",
            source_url=c.get("source_url"),
            fetched_on=_to_date(c.get("fetched_at")),
            review_state=c.get("review_state") or "ai_assisted_pending_review",
        )
        for c in result.citations
    ]
    consulted = [Consulted.model_validate(c) for c in result.consulted]
    return AskResponse(
        id=result.answer_id,
        status=status,  # type: ignore[arg-type]
        reason=reason,
        question=result.question,
        level=result.level.value,
        province=result.province,
        service_group=result.service_group,
        answer_text=result.answer_text,
        citations=citations,
        consulted=consulted,
        review=Review(
            state=result.review_state,  # type: ignore[arg-type]
            reviewed_by=result.reviewed_by,
            reviewed_at=result.reviewed_at,
            self_review=result.self_review,
        ),
        cache=CacheInfo(
            hit=result.cache.hit,
            kind=result.cache.kind,  # type: ignore[arg-type]
            matched_question=result.cache.matched_question,
            similarity=result.cache.similarity,
            served_count=result.cache.served_count,
        ),
        model=result.model,
        created_at=result.created_at,
        retry_after=result.quota_resets_at,
    )


@router.post("/levels/{level}/ask", response_model=AskResponse)
async def ask_question(request: Request, level: ExamLevel, body: AskRequest) -> AskResponse:
    _check_scope(request, body.province, body.service_group)
    _limit(request, ASK_LIMITS)
    runtime = _runtime(request)
    # A missing model (ADR-0008) needs no branch here: generation fails with
    # its 404, the result is "unavailable", and cached answers still serve.
    try:
        result = await ask(
            runtime,
            question=body.question,
            level=level,
            province=body.province,
            service_group=body.service_group,
            use_cache=not body.fresh,
        )
    except InvalidQuestionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return to_response(result)


@router.get("/answers/{answer_id}", response_model=AskResponse)
async def answer(request: Request, response: Response, answer_id: str) -> AskResponse:
    if len(answer_id) > 32:
        raise HTTPException(status_code=404, detail="no such answer")
    result = await get_answer(_runtime(request), answer_id)
    if result is None:
        raise HTTPException(status_code=404, detail="no such answer")
    response.headers["cache-control"] = "public, max-age=60"
    return to_response(result)


@router.get("/status", response_model=Status)
async def status(request: Request) -> Status:
    runtime = _runtime(request)
    async with runtime.pool.connection() as conn:
        cur = await conn.execute(
            "select metric, count from usage_daily where day = %s", (quota.local_day(),)
        )
        day = metrics.read({row["metric"]: int(row["count"]) for row in await cur.fetchall()})
    asked = day.counts.get("ask", 0)
    hits = day.counts.get("cache_hit_exact", 0) + day.counts.get("cache_hit_similar", 0)
    return Status(
        live=await _live_status(request),
        today=day.counts,
        cache_hit_rate_today=round(hits / asked, 3) if asked else None,
        timings_today={
            stage: StageTiming(count=t.count, p50_ms=t.p50_ms, p95_ms=t.p95_ms)
            for stage, t in day.timings.items()
        },
        tokens_today=day.tokens,
        attempts_today=day.attempts,
    )
