"""The raw archive: fetched bytes kept exactly as published, with url, date and checksum.

Files live under data/raw/<source_id>/<sha256>.<ext> (gitignored) and every
fetch appends a line to data/raw/manifest.jsonl. A file is never modified; a
new version of a document is a new file with a new checksum, and the manifest
says which URL it came from and when (docs/data-governance.md, "Raw corpus").
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
DEFAULT_ROOT = REPO / "data" / "raw"


@dataclass(frozen=True)
class ArchiveEntry:
    source_id: str
    url: str
    referring_page: str | None
    fetched_at: str
    sha256: str
    bytes: int
    content_type: str
    status: str  # "new" | "changed" | "unchanged"
    path: str


class RawArchive:
    def __init__(self, root: Path = DEFAULT_ROOT) -> None:
        self.root = root
        self.manifest = root / "manifest.jsonl"

    def last_checksum(self, url: str) -> str | None:
        if not self.manifest.is_file():
            return None
        last: str | None = None
        with self.manifest.open(encoding="utf-8") as handle:
            for line in handle:
                entry = json.loads(line)
                if entry.get("url") == url:
                    last = entry.get("sha256")
        return last

    def store(
        self,
        *,
        source_id: str,
        url: str,
        body: bytes,
        content_type: str,
        referring_page: str | None,
    ) -> ArchiveEntry:
        digest = hashlib.sha256(body).hexdigest()
        previous = self.last_checksum(url)
        status = "new" if previous is None else ("unchanged" if previous == digest else "changed")
        extension = ".pdf" if "pdf" in content_type.lower() or url.lower().endswith(".pdf") else ""
        folder = self.root / source_id
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"{digest}{extension}"
        if not target.exists():
            target.write_bytes(body)  # written once, never modified
        entry = ArchiveEntry(
            source_id=source_id,
            url=url,
            referring_page=referring_page,
            fetched_at=datetime.now(tz=UTC).isoformat(timespec="seconds"),
            sha256=digest,
            bytes=len(body),
            content_type=content_type,
            status=status,
            path=str(target.relative_to(self.root)).replace("\\", "/"),
        )
        with self.manifest.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(entry), ensure_ascii=False) + "\n")
        return entry
