"""Answering a question: cache first, then grounded generation, then the support check.

The order is the design (ADR-0003, ADR-0004, ADR-0008):

1. validate, and stop personal data before anything leaves the machine;
2. exact cache hit: serve it, no model call at all;
3. embed the question, then near-duplicate cache hit: serve it, showing the
   question it was written for;
4. hybrid retrieval, filtered by level, province and group; nothing eligible
   means a refusal with no generation call;
5. generation, answering only from fenced sources;
6. the model's own "sufficient" flag, then the deterministic support check,
   then the citation check. Any failure is a refusal, never a softer answer;
7. store the result, answered or refused, so the next student costs nothing.

At no point does a failure fall back to answering from model memory. Quota
exhaustion and provider outages degrade to "live answers are paused", while
cached content keeps serving.
"""

from __future__ import annotations

import json
import logging
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from psycopg.types.json import Jsonb

from agrilok_core import cache, quota
from agrilok_core.citations import InventedCitationError, display_quote, number_citations
from agrilok_core.dates import nepal_date
from agrilok_core.db import Conn, l2_normalize, vector_literal
from agrilok_core.gemini import GeminiError, GeminiNotConfiguredError
from agrilok_core.levels import ExamLevel, ReviewState
from agrilok_core.pii import find_personal_data
from agrilok_core.prompt import (
    PROMPT_VERSION,
    RESPONSE_SCHEMA,
    SYSTEM_INSTRUCTION,
    SourceForPrompt,
    build_user_text,
)
from agrilok_core.quota import QuotaExceededError
from agrilok_core.retrieval import Candidate, Filters, RetrievalResult, retrieve
from agrilok_core.runtime import Runtime
from agrilok_core.support_check import SUPPORT_CHECK_VERSION, check_support
from agrilok_core.text import question_key

log = logging.getLogger(__name__)

MIN_QUESTION_CHARS = 3
# Students paste whole MCQs, options included; a real Officer question with its
# four options ran past 600 characters (U-03).
MAX_QUESTION_CHARS = 1000


class Stage(StrEnum):
    """Why a question was not answered."""

    NO_SOURCES = "no_sources"
    MODEL_INSUFFICIENT = "model_insufficient"
    SUPPORT_CHECK = "support_check"
    BLOCKED = "blocked"
    PERSONAL_DATA = "personal_data"
    QUOTA = "quota"
    UNAVAILABLE = "unavailable"
    MODEL_ERROR = "model_error"


# Stages that describe the question and the corpus, so the result is worth
# reusing. The others describe a moment (an outage, a quota) or the student's
# own input, and are never cached.
CACHEABLE_STAGES = frozenset(
    {Stage.NO_SOURCES, Stage.MODEL_INSUFFICIENT, Stage.SUPPORT_CHECK, Stage.BLOCKED}
)


class InvalidQuestionError(ValueError):
    pass


@dataclass
class CacheInfo:
    hit: bool = False
    kind: str | None = None  # "exact" | "similar"
    matched_question: str | None = None
    similarity: float | None = None
    served_count: int = 1


@dataclass
class AskResult:
    question: str
    level: ExamLevel
    province: str | None
    service_group: str | None
    status: str  # "answered" | "refused"
    stage: Stage | None = None
    answer_id: str | None = None
    answer_text: str | None = None
    citations: list[dict[str, Any]] = field(default_factory=list)
    consulted: list[dict[str, Any]] = field(default_factory=list)
    review_state: str = ReviewState.PENDING.value
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    self_review: bool | None = None
    cache: CacheInfo = field(default_factory=CacheInfo)
    model: str | None = None
    fallback_from: list[dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))
    quota_resets_at: datetime | None = None
    personal_data: list[str] = field(default_factory=list)
    # For reviewers and the evaluation harness only; never sent to a student.
    withheld_answer: str | None = None
    support_check: list[dict[str, Any]] | None = None
    detail: str | None = None


def without_nul(value: Any) -> Any:
    """Remove NUL characters from every string in a parsed model response.

    Copying damaged Devanagari, the model sometimes emits U+0000 inside a
    quote (seen on SMOKE-03 in the spike). Postgres cannot store NUL in text
    or JSONB, so an answer carrying one failed to save. NUL never carries
    meaning in these documents, so it is dropped before anything else runs.
    """
    if isinstance(value, str):
        return value.replace("\x00", "")
    if isinstance(value, list):
        return [without_nul(v) for v in value]
    if isinstance(value, dict):
        return {k: without_nul(v) for k, v in value.items()}
    return value


def clean_question(question: str) -> str:
    cleaned = " ".join(str(question).replace("\x00", "").split())
    if len(cleaned) < MIN_QUESTION_CHARS:
        raise InvalidQuestionError("question is too short")
    if len(cleaned) > MAX_QUESTION_CHARS:
        raise InvalidQuestionError(f"question is longer than {MAX_QUESTION_CHARS} characters")
    if not any(ch.isalpha() for ch in cleaned):
        raise InvalidQuestionError("question has no words")
    return cleaned


def _new_answer_id() -> str:
    return secrets.token_urlsafe(8)


def _consulted(retrieval: RetrievalResult) -> list[dict[str, Any]]:
    """The documents searched, one entry each, closest first."""
    seen: dict[str, dict[str, Any]] = {}
    for cand, used in [(c, True) for c in retrieval.results] + [
        (c, False) for c in retrieval.below_threshold
    ]:
        d = cand.details
        if not d:
            continue
        entry = seen.get(cand.document_id)
        similarity = round(cand.similarity, 3) if cand.similarity is not None else None
        if entry is None:
            seen[cand.document_id] = {
                "document_id": cand.document_id,
                "title": d.get("title"),
                "province": d.get("province"),
                "doc_class": d.get("doc_class"),
                "resolvable_url": d.get("resolvable_url"),
                "similarity": similarity,
                "used": used,
            }
        else:
            entry["used"] = entry["used"] or used
            if similarity is not None and (entry["similarity"] or 0) < similarity:
                entry["similarity"] = similarity
    return sorted(seen.values(), key=lambda e: -(e["similarity"] or 0))


def _source_for_prompt(cand: Candidate) -> SourceForPrompt:
    d = cand.details
    fetched = cand.fetched_at
    return SourceForPrompt(
        chunk_id=cand.chunk_id,
        title=str(d.get("title", "")),
        exam_level=d.get("exam_level"),
        province=str(d.get("province", "")),
        service_groups=list(d.get("service_groups") or []),
        url=str(d.get("resolvable_url", "")),
        fetched_on=str(nepal_date(fetched) or ""),
        score=cand.similarity or 0.0,
        text=cand.text,
    )


def _citation(n: int, cand: Candidate, quotes: list[str]) -> dict[str, Any]:
    d = cand.details
    fetched = nepal_date(cand.fetched_at)
    return {
        "n": n,
        "chunk_id": cand.chunk_id,
        "document_id": cand.document_id,
        "document_title": d.get("title"),
        "authority": d.get("authority"),
        "doc_class": d.get("doc_class"),
        "doc_type": d.get("doc_type"),
        "exam_level": d.get("exam_level"),
        "province": d.get("province"),
        "section_heading": d.get("section_heading"),
        "quotes": quotes,
        "resolvable_url": d.get("resolvable_url"),
        "source_url": d.get("source_url"),
        "fetched_at": fetched.isoformat() if fetched else None,
        "review_state": d.get("chunk_review_state", ReviewState.PENDING.value),
    }


async def _store(
    conn: Conn,
    result: AskResult,
    *,
    qhash: str,
    query_vector: list[float] | None,
    revision: int,
    origin: str,
    cited_documents: dict[str, str],
) -> None:
    answer_id = _new_answer_id()
    await conn.execute(
        """
        insert into answers (
            id, exam_level, province, service_group, question, question_norm, question_hash,
            question_embedding, status, refusal_stage, answer_text, citations, consulted,
            support_check, withheld_answer, model, prompt_version, check_version,
            corpus_revision, cited_documents, origin
        ) values (
            %(id)s, %(level)s, %(province)s, %(group)s, %(question)s, %(norm)s, %(hash)s,
            %(qv)s::vector, %(status)s, %(stage)s, %(answer)s, %(citations)s, %(consulted)s,
            %(support)s, %(withheld)s, %(model)s, %(prompt)s, %(check)s,
            %(revision)s, %(cited)s, %(origin)s
        )
        """,
        {
            "id": answer_id,
            "level": result.level.value,
            "province": result.province,
            "group": result.service_group,
            "question": result.question,
            "norm": question_key(result.question),
            "hash": qhash,
            "qv": vector_literal(query_vector) if query_vector else None,
            "status": result.status,
            "stage": result.stage.value if result.stage else None,
            "answer": result.answer_text,
            "citations": Jsonb(result.citations),
            "consulted": Jsonb(result.consulted),
            "support": Jsonb(result.support_check) if result.support_check is not None else None,
            "withheld": result.withheld_answer,
            "model": result.model,
            "prompt": PROMPT_VERSION,
            "check": SUPPORT_CHECK_VERSION,
            "revision": revision,
            "cited": Jsonb(cited_documents),
            "origin": origin,
        },
    )
    result.answer_id = answer_id


async def _refresh_review_states(conn: Conn, citations: list[dict[str, Any]]) -> None:
    """Show today's review state for each cited chunk, not the one it had when cached."""
    ids = [c["chunk_id"] for c in citations if c.get("chunk_id")]
    if not ids:
        return
    cur = await conn.execute("select id, review_state from chunks where id = any(%s)", (ids,))
    states = {r["id"]: r["review_state"] for r in await cur.fetchall()}
    for c in citations:
        if c.get("chunk_id") in states:
            c["review_state"] = states[c["chunk_id"]]


async def from_row(conn: Conn, row: dict[str, Any], cache_info: CacheInfo) -> AskResult:
    citations = list(row.get("citations") or [])
    await _refresh_review_states(conn, citations)
    stage = Stage(row["refusal_stage"]) if row.get("refusal_stage") else None
    return AskResult(
        question=row["question"],
        level=ExamLevel(row["exam_level"]),
        province=row.get("province"),
        service_group=row.get("service_group"),
        status=row["status"],
        stage=stage,
        answer_id=row["id"],
        answer_text=row.get("answer_text"),
        citations=citations,
        consulted=list(row.get("consulted") or []),
        review_state=row["review_state"],
        reviewed_by=row.get("reviewed_by"),
        reviewed_at=row.get("reviewed_at"),
        self_review=row.get("self_review"),
        cache=cache_info,
        model=row.get("model"),
        created_at=row["created_at"],
        withheld_answer=row.get("withheld_answer"),
        support_check=row.get("support_check"),
    )


async def get_answer(runtime: Runtime, answer_id: str) -> AskResult | None:
    async with runtime.pool.connection() as conn:
        cur = await conn.execute(
            "select * from answers where id = %s and invalidated_at is null", (answer_id,)
        )
        row = await cur.fetchone()
        if row is None:
            return None
        return await from_row(conn, row, CacheInfo(served_count=int(row["served_count"])))


async def ask(
    runtime: Runtime,
    *,
    question: str,
    level: ExamLevel,
    province: str | None = None,
    service_group: str | None = None,
    use_cache: bool = True,
    store: bool = True,
    origin: str = "live",
    models: list[str] | None = None,
) -> AskResult:
    settings = runtime.settings
    q = clean_question(question)
    result = AskResult(
        question=q, level=level, province=province, service_group=service_group, status="refused"
    )
    qhash = cache.question_hash(level.value, province, service_group, q)

    async with runtime.pool.connection() as conn:
        await quota.bump(conn, "ask")
        found = find_personal_data(q)
        if found:
            await quota.bump(conn, "refused_personal_data")
            result.stage = Stage.PERSONAL_DATA
            result.personal_data = found
            return result
        if use_cache:
            row = await cache.lookup_exact(conn, qhash)
            if row is not None:
                served = await cache.record_hit(conn, row["id"])
                await quota.bump(conn, "cache_hit_exact")
                return await from_row(
                    conn, row, CacheInfo(hit=True, kind="exact", served_count=served)
                )

    if not runtime.gemini.configured:
        result.stage = Stage.UNAVAILABLE
        result.detail = "the model is not configured"
        return result

    try:
        query_vector = l2_normalize(await runtime.gemini.embed_query(q))
    except QuotaExceededError as exc:
        return await _quota_refusal(runtime, result, exc)
    except (GeminiError, GeminiNotConfiguredError) as exc:
        log.warning("embedding unavailable: %s", exc)
        result.stage = Stage.UNAVAILABLE
        result.detail = "search is temporarily unavailable"
        return result

    async with runtime.pool.connection() as conn:
        if use_cache:
            similar = await cache.lookup_similar(
                conn,
                level=level.value,
                province=province,
                group=service_group,
                query_vector=query_vector,
                threshold=settings.semantic_cache_similarity_threshold,
            )
            if similar is not None:
                row, similarity = similar
                served = await cache.record_hit(conn, row["id"])
                await quota.bump(conn, "cache_hit_similar")
                return await from_row(
                    conn,
                    row,
                    CacheInfo(
                        hit=True,
                        kind="similar",
                        matched_question=row["question"],
                        similarity=round(similarity, 3),
                        served_count=served,
                    ),
                )
        retrieval = await retrieve(
            conn,
            question=q,
            query_vector=query_vector,
            filters=Filters(level=level, province=province, service_group=service_group),
            top_k=settings.retrieval_top_k,
            min_score=settings.retrieval_min_score,
            keyword_min_score=settings.retrieval_keyword_min_score,
        )
        revision = await cache.corpus_revision(conn)

    result.consulted = _consulted(retrieval)
    if not retrieval.results:
        result.stage = Stage.NO_SOURCES
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)

    sources = [_source_for_prompt(c) for c in retrieval.results]
    try:
        generation = await runtime.gemini.generate(
            system_instruction=SYSTEM_INSTRUCTION,
            user_text=build_user_text(q, sources),
            response_schema=RESPONSE_SCHEMA,
            models=models or settings.generation_models,
        )
    except QuotaExceededError as exc:
        return await _quota_refusal(runtime, result, exc)
    except (GeminiError, GeminiNotConfiguredError) as exc:
        log.warning("generation unavailable: %s", exc)
        result.stage = Stage.UNAVAILABLE
        result.detail = "live answers are temporarily unavailable"
        return result

    result.model = generation.model
    result.fallback_from = generation.skipped
    if generation.blocked:
        result.stage = Stage.BLOCKED
        result.detail = f"the provider blocked the response ({generation.block_reason})"
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)

    try:
        parsed = without_nul(json.loads(generation.text or ""))
        if not isinstance(parsed, dict):
            raise TypeError("not an object")
    except (json.JSONDecodeError, TypeError) as exc:
        # Transient and uninformative about the question: never cached.
        log.warning("model returned malformed structured output: %s", exc)
        result.stage = Stage.MODEL_ERROR
        result.withheld_answer = generation.text
        return result

    raw_answer = parsed.get("answer")
    answer_text = raw_answer if isinstance(raw_answer, str) else ""
    if parsed.get("sufficient") is not True:
        result.stage = Stage.MODEL_INSUFFICIENT
        result.withheld_answer = answer_text or None
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)

    by_id = {c.chunk_id: c for c in retrieval.results}
    claims = parsed.get("claims")
    support = check_support(
        claims if isinstance(claims, list) else None,
        {cid: c.text for cid, c in by_id.items()},
        question=q,
        meta_by_id={
            cid: " ".join(
                [
                    str(c.details.get("title", "")),
                    str(c.details.get("province", "")),
                    *[str(g) for g in c.details.get("service_groups") or []],
                ]
            )
            for cid, c in by_id.items()
        },
    )
    result.support_check = [r.as_dict() for r in support.results]
    if not support.supported:
        result.stage = Stage.SUPPORT_CHECK
        result.detail = support.reason
        result.withheld_answer = answer_text or None
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)

    try:
        numbered = number_citations(answer_text, by_id.keys())
    except InventedCitationError as exc:
        result.stage = Stage.SUPPORT_CHECK
        result.detail = str(exc)
        result.withheld_answer = answer_text or None
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)
    if not numbered.order:
        result.stage = Stage.SUPPORT_CHECK
        result.detail = "the answer carries no citation"
        result.withheld_answer = answer_text or None
        return await _finish(runtime, result, qhash, query_vector, revision, origin, {}, store)

    quotes_by_chunk: dict[str, list[str]] = {}
    for claim_result in support.results:
        if claim_result.ok and claim_result.quote.strip():
            quotes = quotes_by_chunk.setdefault(claim_result.source_id, [])
            short = display_quote(claim_result.quote)
            if short not in quotes:
                quotes.append(short)
    result.status = "answered"
    result.stage = None
    result.answer_text = numbered.text
    result.citations = [
        _citation(n, by_id[cid], quotes_by_chunk.get(cid, [])[:3])
        for n, cid in enumerate(numbered.order, start=1)
    ]
    cited_documents = {
        by_id[cid].document_id: str(by_id[cid].details.get("checksum", ""))
        for cid in numbered.order
    }
    return await _finish(
        runtime, result, qhash, query_vector, revision, origin, cited_documents, store
    )


async def _quota_refusal(runtime: Runtime, result: AskResult, exc: QuotaExceededError) -> AskResult:
    async with runtime.pool.connection() as conn:
        await quota.bump(conn, "quota_blocked")
    result.stage = Stage.QUOTA
    result.quota_resets_at = quota.next_reset()
    result.detail = f"today's {exc.kind} allowance is used up"
    return result


async def _finish(
    runtime: Runtime,
    result: AskResult,
    qhash: str,
    query_vector: list[float] | None,
    revision: int,
    origin: str,
    cited_documents: dict[str, str],
    store: bool,
) -> AskResult:
    async with runtime.pool.connection() as conn:
        metric = "answered" if result.status == "answered" else f"refused_{result.stage}"
        await quota.bump(conn, metric)
        if store and (result.status == "answered" or result.stage in CACHEABLE_STAGES):
            await _store(
                conn,
                result,
                qhash=qhash,
                query_vector=query_vector,
                revision=revision,
                origin=origin,
                cited_documents=cited_documents,
            )
    log.info(
        "ask level=%s stage=%s model=%s q=%s",
        result.level.value,
        result.stage or "answered",
        result.model,
        qhash[:12],
    )
    return result
