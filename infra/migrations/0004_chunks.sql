-- Retrievable chunks, their embeddings, and the BM25 term index (ADR-0013).

create table chunks (
    id                   text primary key,
    document_id          text not null references documents (id) on delete cascade,
    chunk_index          integer not null check (chunk_index >= 0),
    text                 text not null check (length(text) > 0),
    content_hash         text not null check (content_hash ~ '^[0-9a-f]{64}$'),
    approx_tokens        integer not null check (approx_tokens >= 0),
    section_heading      text,
    -- Number of index terms in this chunk: BM25's document length.
    term_count           integer not null default 0 check (term_count >= 0),

    -- Vectors are stored L2-normalised so cosine distance and inner product
    -- agree. The model and dimension travel with the vector
    -- (docs/rag-pipeline.md, "embed").
    embedding            vector(768),
    embedding_model      text,
    embedding_dimensions integer,

    review_state         text not null default 'ai_assisted_pending_review'
                         check (review_state in ('verified', 'ai_assisted_pending_review')),
    reviewed_by          text,
    reviewed_at          timestamptz,
    self_review          boolean,

    created_at           timestamptz not null default now(),

    unique (document_id, chunk_index),
    constraint chunks_embedding_recorded check (
        embedding is null or (embedding_model is not null and embedding_dimensions is not null)
    ),
    constraint chunks_verified_recorded check (
        review_state <> 'verified'
        or (reviewed_by is not null and reviewed_at is not null and self_review is not null)
    )
);

create index chunks_document_idx on chunks (document_id);

create table chunk_terms (
    chunk_id text not null references chunks (id) on delete cascade,
    term     text not null,
    tf       integer not null check (tf > 0),
    primary key (chunk_id, term)
);

create index chunk_terms_term_idx on chunk_terms (term);

-- Every provenance field a chunk must carry (docs/architecture.md, "Data model
-- essentials"), in one place. Provenance is stored once on the document and
-- joined here, so it cannot drift between a document and its chunks.
create view chunk_provenance as
select
    c.id                    as chunk_id,
    c.document_id,
    d.source_id,
    d.source_url,
    d.resolvable_url,
    d.fetched_at,
    d.checksum,
    d.exam_level,
    d.service_groups,
    d.province,
    d.year,
    d.doc_type,
    d.doc_class,
    d.extraction_method,
    d.extraction_confidence,
    c.review_state,
    c.reviewed_by,
    c.reviewed_at,
    c.section_heading,
    c.chunk_index,
    d.admission,
    d.superseded
from chunks c
join documents d on d.id = c.document_id;
