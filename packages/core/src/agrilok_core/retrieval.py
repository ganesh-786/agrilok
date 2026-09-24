"""Hybrid retrieval: vector similarity plus a BM25 keyword index, fused (ADR-0013).

Filters are hard, and they are in the SQL, not applied afterwards:

- only admitted, not superseded documents (ADR-0012);
- syllabus chunks must match the exam level exactly; Level 4 and Level 7
  never mix (CLAUDE.md rule 3);
- reference documents (Acts, the Constitution) apply to every level, province
  and group (ADR-0011);
- province and service group, when given, filter syllabus chunks strictly.

Retrieval is where RAG systems fail (docs/rag-pipeline.md), so every number
here is a measured setting, and changing one means running the golden set.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from agrilok_core.db import Conn, vector_literal
from agrilok_core.levels import ExamLevel
from agrilok_core.text import search_terms

RRF_K = 60
CANDIDATES_PER_SIDE = 20
KEYWORD_RESCUE_RANK = 3
BM25_K1 = 1.2
BM25_B = 0.75

_FILTER = """
    d.admission = 'admitted'
    and not d.superseded
    and (
        (d.doc_class = 'syllabus' and d.exam_level = %(level)s)
        or d.doc_class = 'reference'
    )
    and (%(province)s::text is null or d.doc_class = 'reference' or d.province = %(province)s)
    and (
        %(group)s::text is null or d.doc_class = 'reference' or %(group)s = any(d.service_groups)
    )
"""

_VECTOR_SQL = f"""
select c.id, 1 - (c.embedding <=> %(qv)s::vector) as similarity
from chunks c
join documents d on d.id = c.document_id
where c.embedding is not null and {_FILTER}
order by c.embedding <=> %(qv)s::vector
limit %(n)s
"""  # noqa: S608 - _FILTER is a constant; every value is a bound parameter

_KEYWORD_SQL = f"""
with eligible as (
    select c.id, c.term_count
    from chunks c
    join documents d on d.id = c.document_id
    where {_FILTER}
),
stats as (
    select count(*)::float8 as n, coalesce(avg(nullif(term_count, 0)), 1)::float8 as avgdl
    from eligible
),
df as (
    select t.term, count(*)::float8 as df
    from chunk_terms t
    join eligible e on e.id = t.chunk_id
    where t.term = any(%(terms)s)
    group by t.term
)
select
    t.chunk_id as id,
    sum(
        ln(1 + (s.n - df.df + 0.5) / (df.df + 0.5))
        * (t.tf * (%(k1)s + 1))
        / (t.tf + %(k1)s * (1 - %(b)s + %(b)s * e.term_count / s.avgdl))
    ) as score
from chunk_terms t
join eligible e on e.id = t.chunk_id
join df on df.term = t.term
cross join stats s
where t.term = any(%(terms)s)
group by t.chunk_id
order by score desc, t.chunk_id
limit %(n)s
"""  # noqa: S608 - _FILTER is a constant; every value is a bound parameter

_SIMILARITY_SQL = """
select c.id, 1 - (c.embedding <=> %(qv)s::vector) as similarity
from chunks c
where c.id = any(%(ids)s) and c.embedding is not null
"""

_DETAILS_SQL = """
select
    c.id, c.document_id, c.text, c.section_heading, c.chunk_index,
    c.review_state as chunk_review_state, c.reviewed_by as chunk_reviewed_by,
    d.title, d.authority, d.doc_class, d.doc_type, d.exam_level, d.province,
    d.service_groups, d.resolvable_url, d.source_url, d.fetched_at, d.checksum,
    d.review_state as document_review_state, d.reviewed_by as document_reviewed_by,
    d.reviewed_at as document_reviewed_at, d.self_review as document_self_review
from chunks c
join documents d on d.id = c.document_id
where c.id = any(%(ids)s)
"""


@dataclass(frozen=True)
class Filters:
    level: ExamLevel
    province: str | None = None
    service_group: str | None = None

    def params(self) -> dict[str, Any]:
        return {"level": self.level.value, "province": self.province, "group": self.service_group}


@dataclass
class Candidate:
    chunk_id: str
    similarity: float | None = None
    vector_rank: int | None = None
    keyword_rank: int | None = None
    keyword_score: float | None = None
    fused: float = 0.0
    details: dict[str, Any] = field(default_factory=dict)

    @property
    def text(self) -> str:
        return str(self.details.get("text", ""))

    @property
    def document_id(self) -> str:
        return str(self.details.get("document_id", ""))

    @property
    def fetched_at(self) -> datetime | None:
        value = self.details.get("fetched_at")
        return value if isinstance(value, datetime) else None


@dataclass
class RetrievalResult:
    results: list[Candidate]
    # Candidates that were looked at but did not clear the score floor. Kept
    # for a reviewer to see why a question was refused; never sent to the model.
    below_threshold: list[Candidate]
    keyword_terms: list[str]
    vector_used: bool


def _fuse(
    vector_hits: Sequence[dict[str, Any]], keyword_hits: Sequence[dict[str, Any]]
) -> dict[str, Candidate]:
    candidates: dict[str, Candidate] = {}
    for rank, row in enumerate(vector_hits, start=1):
        cand = candidates.setdefault(row["id"], Candidate(row["id"]))
        cand.similarity = float(row["similarity"])
        cand.vector_rank = rank
        cand.fused += 1.0 / (RRF_K + rank)
    for rank, row in enumerate(keyword_hits, start=1):
        cand = candidates.setdefault(row["id"], Candidate(row["id"]))
        cand.keyword_rank = rank
        cand.keyword_score = float(row["score"])
        cand.fused += 1.0 / (RRF_K + rank)
    return candidates


def is_eligible(cand: Candidate, min_score: float, keyword_min_score: float) -> bool:
    """A chunk may reach the model if its vector score clears the floor.

    A top-three keyword match is allowed a lower vector floor: exact terms
    (an Act's name, an article number) are what vector search tends to rank
    too low, and what keyword search exists to catch (ADR-0013).
    """
    if cand.similarity is None:
        return False
    if cand.similarity >= min_score:
        return True
    return (
        cand.keyword_rank is not None
        and cand.keyword_rank <= KEYWORD_RESCUE_RANK
        and cand.similarity >= keyword_min_score
    )


async def _load_details(conn: Conn, candidates: Sequence[Candidate]) -> None:
    if not candidates:
        return
    cur = await conn.execute(_DETAILS_SQL, {"ids": [c.chunk_id for c in candidates]})
    rows = {row["id"]: row for row in await cur.fetchall()}
    for cand in candidates:
        cand.details = dict(rows.get(cand.chunk_id, {}))


async def retrieve(
    conn: Conn,
    *,
    question: str,
    query_vector: Sequence[float] | None,
    filters: Filters,
    top_k: int,
    min_score: float,
    keyword_min_score: float,
    use_keywords: bool = True,
) -> RetrievalResult:
    params = filters.params()
    terms = sorted(search_terms(question)) if use_keywords else []

    vector_hits: list[dict[str, Any]] = []
    if query_vector is not None:
        cur = await conn.execute(
            _VECTOR_SQL, {**params, "qv": vector_literal(query_vector), "n": CANDIDATES_PER_SIDE}
        )
        vector_hits = list(await cur.fetchall())

    keyword_hits: list[dict[str, Any]] = []
    if terms:
        cur = await conn.execute(
            _KEYWORD_SQL,
            {**params, "terms": terms, "k1": BM25_K1, "b": BM25_B, "n": CANDIDATES_PER_SIDE},
        )
        keyword_hits = list(await cur.fetchall())

    candidates = _fuse(vector_hits, keyword_hits)

    # Keyword-only candidates still need a vector score to be judged.
    missing = [c.chunk_id for c in candidates.values() if c.similarity is None]
    if missing and query_vector is not None:
        cur = await conn.execute(
            _SIMILARITY_SQL, {"qv": vector_literal(query_vector), "ids": missing}
        )
        for row in await cur.fetchall():
            candidates[row["id"]].similarity = float(row["similarity"])

    ordered = sorted(candidates.values(), key=lambda c: (-c.fused, c.chunk_id))
    if query_vector is None:
        # Keyword-only mode is for the syllabus search page, never for the model.
        eligible = [c for c in ordered if c.keyword_rank is not None][:top_k]
        below: list[Candidate] = []
    else:
        eligible = [c for c in ordered if is_eligible(c, min_score, keyword_min_score)][:top_k]
        eligible_ids = {c.chunk_id for c in eligible}
        below = [c for c in ordered if c.chunk_id not in eligible_ids][:top_k]
    await _load_details(conn, [*eligible, *below])
    return RetrievalResult(
        results=eligible,
        below_threshold=below,
        keyword_terms=terms,
        vector_used=query_vector is not None,
    )
