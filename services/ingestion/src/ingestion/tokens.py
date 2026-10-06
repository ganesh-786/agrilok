"""Count what the embedding model makes of each chunk, against its input limit.

Chunks are cut at a size worked out as words / 0.75 (ingestion.chunking).
That is not a tokeniser, and it is known to undercount Devanagari
(docs/nepali-devanagari.md). The embedding model reads only so many tokens of
a text. A chunk longer than that is embedded without its end, and nothing
says so: the vector stands for the first part, and a question about the rest
does not find the chunk.

Only the provider's own tokeniser can say how long a chunk really is. Bytes
give no usable bound: a Devanagari letter is three bytes and may be one token
or several. So this asks the provider, one metadata call per chunk. Such a
call generates nothing and draws on no quota this project meters.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from agrilok_core.runtime import Runtime

# Input limits as published at https://ai.google.dev/gemini-api/docs/embeddings,
# read on 2026-10-06. A dated observation, like the quota figures: check the
# page before relying on one, and pass --limit-tokens if it has moved.
INPUT_LIMITS = {"gemini-embedding-001": 2048, "gemini-embedding-2": 8192}


class UnknownLimitError(ValueError):
    pass


@dataclass(frozen=True)
class Counted:
    chunk_id: str
    tokens: int
    approx_tokens: int  # what the chunker assumed
    octets: int


@dataclass(frozen=True)
class Audit:
    limit: int
    counted: list[Counted]
    chunks_in_corpus: int
    # The longest chunk, in bytes, that was not counted. Zero if all were.
    longest_uncounted_octets: int

    @property
    def over(self) -> list[Counted]:
        return [c for c in self.counted if c.tokens > self.limit]

    @property
    def largest(self) -> Counted | None:
        return max(self.counted, key=lambda c: c.tokens, default=None)

    @property
    def uncounted_could_reach(self) -> int:
        """An estimate, not a count: the longest uncounted chunk at the densest rate seen.

        Useful only to decide whether counting the rest is worth it.
        """
        densest = max((c.tokens / c.octets for c in self.counted if c.octets), default=0.0)
        return round(self.longest_uncounted_octets * densest)


def limit_for(model: str, override: int | None = None) -> int:
    if override is not None:
        return override
    if model not in INPUT_LIMITS:
        raise UnknownLimitError(
            f"no input limit is recorded for {model}; look it up and pass --limit-tokens"
        )
    return INPUT_LIMITS[model]


async def audit(
    runtime: Runtime,
    *,
    longest: int | None,
    limit: int,
    model: str | None = None,
    report: Callable[[str], None] = print,
) -> Audit:
    """Count the `longest` chunks by size in bytes, or every chunk if `longest` is None.

    Longest first, because a chunk can only be over the limit by being long,
    and the first few answer the question for most of the corpus.
    """
    async with runtime.pool.connection() as conn:
        cur = await conn.execute(
            """
            select c.id, c.text, c.approx_tokens, octet_length(c.text) as octets
            from chunks c join documents d on d.id = c.document_id
            where d.admission <> 'rejected'
            order by octet_length(c.text) desc, c.id
            """
        )
        rows = list(await cur.fetchall())
    chosen = rows if longest is None else rows[:longest]
    counted = []
    for index, row in enumerate(chosen, start=1):
        tokens = await runtime.gemini.count_tokens(row["text"], model)
        counted.append(Counted(row["id"], tokens, int(row["approx_tokens"]), int(row["octets"])))
        if index % 10 == 0 or index == len(chosen):
            report(f"counted {index}/{len(chosen)}")
    rest = rows[len(chosen) :]
    return Audit(
        limit=limit,
        counted=counted,
        chunks_in_corpus=len(rows),
        longest_uncounted_octets=int(rest[0]["octets"]) if rest else 0,
    )
