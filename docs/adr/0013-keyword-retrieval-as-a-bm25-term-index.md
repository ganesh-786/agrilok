# ADR-0013: Build the keyword half of hybrid retrieval as a BM25 term index in plain Postgres

- **Status:** Proposed
- **Date:** 2026-09-24
- **Deciders:** @ganesh-786
- **Supersedes / Superseded by:** none. Implements the "hybrid keyword +
  vector" retrieval that [docs/architecture.md](../architecture.md) and
  [docs/rag-pipeline.md](../rag-pipeline.md) already require.

## Context

Retrieval must be hybrid: vector search misses exact terms (Act names, article
numbers, scientific names), keyword search misses paraphrase. The spike was
vector-only. Phase 1 has to add the keyword side, and three measured facts
constrain how:

1. **The Devanagari text is damaged.** Matras are misplaced and letters are
   lost in extraction (`हक` extracts as `िक`). The support check already
   compares words on a consonant skeleton with Nepali suffix stemming, because
   exact matching failed on real answers. A keyword index that matches raw
   strings would miss the same words the support check learned to find.
2. **Postgres full-text search does not help with Nepali.** There is no Nepali
   dictionary, and the default parser's idea of a letter depends on the
   database locale; under the `C` locale Devanagari is not a word character.
3. **The local database has no `pg_trgm`.** The embedded Postgres used for
   development (see `infra/README.md`) ships `pgvector` and nothing else from
   contrib. Hosted Postgres (Supabase) has `pg_trgm`, but relying on it would
   make development and production retrieve differently.

## Options considered

### Option A - Postgres full-text search or `pg_trgm`

Least code. Fails fact 2 for Nepali, and fact 3 means the local database cannot
run it at all, so it could not be tested the way it runs in production.

### Option B - A separate search engine (OpenSearch, Meilisearch, Typesense)

Good ranking out of the box. A second datastore to host, keep consistent and
pay for, which the architecture explicitly rules out at this corpus size, and
none of them know the skeleton normalisation either.

### Option C - A BM25 term index in plain tables, with project-owned normalisation

At ingestion, each chunk's text is normalised with the same building blocks
the support check uses (consonant skeleton, Nepali suffix stems, ASCII digits)
into terms stored in a `chunk_terms(chunk_id, term, tf)` table. At query time
the question goes through the same function and BM25 is computed in SQL.
Vector and keyword rankings are merged with reciprocal rank fusion. Runs on
any Postgres and needs no extension beyond `pgvector`.

## Decision

**Option C.**

- `agrilok_core.text.search_terms()` is the single tokeniser for indexing and
  querying. It shares its normalisation primitives with the support check,
  which keeps its own word comparison exactly as it was validated on the
  golden set.
- BM25 uses `k1 = 1.2` and `b = 0.75`, computed over admitted chunks only.
- Fusion is reciprocal rank fusion with `k = 60`. A chunk is eligible if its
  vector similarity clears `RETRIEVAL_MIN_SCORE`, or if it is in the keyword
  top three and clears a lower floor (`RETRIEVAL_KEYWORD_MIN_SCORE`).
- The golden set is run before and after, and both numbers go in the PR, as
  [docs/rag-pipeline.md](../rag-pipeline.md) requires for any retrieval change.

## Consequences

### Good

- Development and production retrieve identically.
- Damaged Devanagari is matched the way the project already measured works.
- No new datastore, no new extension.

### Bad

- The project owns a tokeniser. Stemming rules and stopwords are ours to get
  wrong, and a change to them changes retrieval, so it is a measured change.
- BM25 in SQL is slower than a purpose-built engine. Fine at thousands of
  chunks, worth revisiting at hundreds of thousands.
- The term table must be rebuilt whenever the normaliser changes.

### Neutral

- Romanised Nepali queries ("krishi") still match nothing on the keyword side.
  That is recorded as a known gap, not solved here.

## Verification

Wrong if the golden set gets worse with keyword retrieval on than with it off,
or if keyword matches regularly pull in chunks the vector side would never
have ranked and the model then refuses on them.

Track: golden-set result with and without the keyword side; how often a
keyword-only candidate is cited in a shown answer.

## References

- `spike/lib/support-check.mjs` (the normalisation this reuses)
- Robertson and Zaragoza, "The Probabilistic Relevance Framework: BM25 and
  Beyond" (2009), for the ranking function
- Cormack, Clarke and Buettcher, "Reciprocal Rank Fusion outperforms Condorcet
  and individual Rank Learning Methods" (SIGIR 2009)
