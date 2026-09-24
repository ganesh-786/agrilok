"""The public response shapes. apps/web/lib/api.ts mirrors these by hand; keep them in step."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ReviewStateValue = Literal["verified", "ai_assisted_pending_review"]


class Label(BaseModel):
    code: str
    name_en: str
    name_ne: str


class LevelLabel(Label):
    post_en: str
    post_ne: str


class Review(BaseModel):
    """Exactly two states, always shown (CLAUDE.md rule 2)."""

    state: ReviewStateValue
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    self_review: bool | None = None


class LiveStatus(BaseModel):
    configured: bool
    available: bool
    reason: Literal["ok", "not_configured", "quota", "model_missing"]
    used_today: int
    limit_today: int
    resets_at: datetime


class LibraryStats(BaseModel):
    documents: int
    syllabi_by_level: dict[str, int]
    reference_documents: int
    verified_documents: int
    provinces: list[str]
    last_fetched_on: date | None


class Meta(BaseModel):
    levels: list[LevelLabel]
    provinces: list[Label]
    service_groups: list[Label]
    library: LibraryStats
    live: LiveStatus


class DocumentSummary(BaseModel):
    id: str
    title: str
    authority: str
    doc_class: Literal["syllabus", "reference"]
    doc_type: str
    exam_level: str | None
    province: str
    service_groups: list[str]
    fetched_on: date
    resolvable_url: str
    source_url: str
    archived: bool = Field(description="The student link is an archive copy; the original is gone.")
    review: Review
    chunk_count: int
    extraction_confidence: float
    superseded: bool


class OutlineEntry(BaseModel):
    label: str
    text: str


class DocumentDetail(DocumentSummary):
    referring_page: str | None
    checksum: str
    bytes: int
    acquisition: Literal["crawled", "manual"]
    source_name: str
    extraction_method: Literal["text_layer", "ocr"]
    gibberish_lines_dropped: int
    admitted_at: datetime | None
    as_of: str | None
    outline: list[OutlineEntry]


class LevelLibrary(BaseModel):
    level: str
    syllabi: list[DocumentSummary]
    reference: list[DocumentSummary]


class SearchHit(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    doc_class: str
    exam_level: str | None
    province: str
    section_heading: str | None
    snippet: str
    resolvable_url: str
    fetched_on: date
    review_state: ReviewStateValue


class SearchResults(BaseModel):
    level: str
    query: str
    terms: list[str]
    hits: list[SearchHit]


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    province: str | None = Field(default=None, max_length=40)
    service_group: str | None = Field(default=None, max_length=60)
    # "Not my question": skip the cache for a fresh answer. Costs a live call.
    fresh: bool = False


class Citation(BaseModel):
    n: int
    chunk_id: str
    document_id: str
    document_title: str
    authority: str | None
    doc_class: str | None
    doc_type: str | None
    exam_level: str | None
    province: str | None
    section_heading: str | None
    quotes: list[str]
    resolvable_url: str
    source_url: str | None
    fetched_on: date | None
    review_state: ReviewStateValue


class Consulted(BaseModel):
    document_id: str
    title: str | None
    province: str | None
    doc_class: str | None
    resolvable_url: str | None
    similarity: float | None
    used: bool


class CacheInfo(BaseModel):
    hit: bool
    kind: Literal["exact", "similar"] | None
    matched_question: str | None
    similarity: float | None
    served_count: int


class Reason(BaseModel):
    code: str
    detail: str | None = None


class AskResponse(BaseModel):
    id: str | None
    status: Literal["answered", "refused", "unavailable"]
    reason: Reason | None
    question: str
    level: str
    province: str | None
    service_group: str | None
    answer_text: str | None
    citations: list[Citation]
    consulted: list[Consulted]
    review: Review
    cache: CacheInfo
    model: str | None
    created_at: datetime
    retry_after: datetime | None = None


class CommonQuestion(BaseModel):
    id: str
    question: str
    province: str | None
    served_count: int
    review: Review


class Status(BaseModel):
    live: LiveStatus
    today: dict[str, int]
    cache_hit_rate_today: float | None
