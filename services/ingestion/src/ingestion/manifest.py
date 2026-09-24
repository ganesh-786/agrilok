"""Document manifests: what a document is, who published it, and where it came from.

The format is the one the Phase 0 source list (spike/corpus/sources.yaml) was
written in, so hand-collected and crawled documents describe themselves the
same way. Every field that becomes a citation is required.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import yaml

LEVELS = {4: "level_4", 7: "level_7"}

PROVINCE_AUTHORITY = {
    "federal": "Public Service Commission (Lok Sewa Aayog)",
    "koshi": "Koshi Province Public Service Commission",
    "madhesh": "Madhesh Province Public Service Commission",
    "bagmati": "Bagmati Province Public Service Commission",
    "gandaki": "Gandaki Province Public Service Commission",
    "lumbini": "Lumbini Province Public Service Commission",
    "karnali": "Karnali Province Public Service Commission",
    "sudurpaschim": "Sudurpaschim Province Public Service Commission",
}

# The referring page, not the file host, is the authority for a reference
# document (ADR-0007). The ministry's pages carry an inconsistent publisher
# name (whitelist.yml, moald-policy notes), so the domain is shown instead of
# a ministry name that may be wrong.
REFERRING_AUTHORITY = {
    "moald.gov.np": "Ministry responsible for agriculture (moald.gov.np)",
    "lawcommission.gov.np": "Nepal Law Commission",
}


class ManifestError(ValueError):
    pass


@dataclass(frozen=True)
class DocumentManifest:
    id: str
    title: str
    url: str
    province: str
    exam_level: str | None
    level_basis: str
    doc_class: str
    doc_type: str
    service_groups: tuple[str, ...]
    fetched_on: date
    authority: str
    referring_page: str | None = None
    archived_via: str | None = None
    as_of: str | None = None
    note: str | None = None

    @property
    def resolvable_url(self) -> str:
        # A document whose official URL now 404s is linked through its
        # verified archive snapshot; the original stays recorded as source_url.
        return self.archived_via or self.url


class OutOfScopeError(ManifestError):
    """A real document for an exam level this product does not cover."""


def _required(entry: dict[str, Any], key: str) -> Any:
    value = entry.get(key)
    if value in (None, ""):
        raise ManifestError(f"{entry.get('id', '?')}: missing {key}")
    return value


def _authority(province: str, doc_class: str, referring_page: str | None) -> str:
    if doc_class == "reference" and referring_page:
        host = urlsplit(referring_page).hostname or ""
        return REFERRING_AUTHORITY.get(host.removeprefix("www."), host)
    try:
        return PROVINCE_AUTHORITY[province]
    except KeyError as exc:
        raise ManifestError(f"unknown province {province!r}") from exc


def parse_entry(entry: dict[str, Any]) -> DocumentManifest:
    doc_id = str(_required(entry, "id"))
    doc_class = str(entry.get("doc_class") or "syllabus")
    if doc_class not in {"syllabus", "reference"}:
        raise ManifestError(f"{doc_id}: doc_class must be syllabus or reference")
    raw_level = entry.get("level")
    if doc_class == "reference":
        if raw_level is not None:
            raise ManifestError(f"{doc_id}: a reference document has no exam level (ADR-0011)")
        exam_level, level_basis = None, "not_applicable"
    else:
        if raw_level not in LEVELS:
            raise OutOfScopeError(f"{doc_id}: level {raw_level} is outside Level 4 and Level 7")
        exam_level = LEVELS[int(raw_level)]
        level_basis = str(entry.get("level_confidence") or "stated")
        if level_basis not in {"stated", "inferred"}:
            raise ManifestError(f"{doc_id}: level_confidence must be stated or inferred")
    province = str(_required(entry, "province"))
    referring_page = entry.get("referring_page")
    fetched = _required(entry, "verified_on")
    fetched_on = fetched if isinstance(fetched, date) else date.fromisoformat(str(fetched))
    return DocumentManifest(
        id=doc_id,
        title=str(_required(entry, "title")),
        url=str(_required(entry, "url")),
        province=province,
        exam_level=exam_level,
        level_basis=level_basis,
        doc_class=doc_class,
        doc_type=str(_required(entry, "doc_type")),
        service_groups=tuple(str(g) for g in entry.get("groups") or []),
        fetched_on=fetched_on,
        authority=str(entry.get("authority") or _authority(province, doc_class, referring_page)),
        referring_page=str(referring_page) if referring_page else None,
        archived_via=str(entry["archived_via"]) if entry.get("archived_via") else None,
        as_of=str(entry["as_of"]) if entry.get("as_of") else None,
        note=str(entry["note"]) if entry.get("note") else None,
    )


def load_entries(path: Path) -> list[dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    documents = data.get("documents") if isinstance(data, dict) else None
    if not isinstance(documents, list):
        raise ManifestError(f"{path}: expected a top-level `documents:` list")
    return [d for d in documents if isinstance(d, dict)]
