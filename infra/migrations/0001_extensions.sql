-- pgvector stores chunk and question embeddings. It is the only extension the
-- schema depends on: keyword retrieval is a plain-table BM25 index precisely so
-- that no other extension is needed (ADR-0013), which keeps the embedded
-- development database and hosted Postgres behaving the same.
create extension if not exists vector;
