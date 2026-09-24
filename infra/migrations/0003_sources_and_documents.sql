-- Where documents come from, and the documents themselves.
--
-- Provenance columns (source_url, fetched_at, checksum, bytes) are NOT NULL on
-- purpose: without them a citation cannot be built, and an uncitable document
-- must not exist (infra/README.md). Do not relax them in a later migration.

create table sources (
    id          text primary key,           -- a whitelist id, or 'manual-phase0'
    name        text not null,
    acquisition text not null check (acquisition in ('crawled', 'manual')),
    note        text not null default '',
    created_at  timestamptz not null default now()
);

create table documents (
    id                     text primary key,
    source_id              text not null references sources (id),
    title                  text not null,
    authority              text not null,
    doc_class              text not null check (doc_class in ('syllabus', 'reference')),
    doc_type               text not null references doc_types (code),
    -- NULL only for reference documents, which apply to every level (ADR-0011).
    exam_level             text references exam_levels (code),
    level_basis            text not null check (level_basis in ('stated', 'inferred', 'not_applicable')),
    province               text not null references provinces (code),
    service_groups         text[] not null default '{}',
    year                   text not null default 'unstated',

    -- Provenance.
    source_url             text not null,   -- the URL the authority published to
    resolvable_url         text not null,   -- what a student is linked to (an archive copy if the original is gone)
    referring_page         text,            -- the authority page that vouches for a file hosted elsewhere (ADR-0007)
    fetched_at             timestamptz not null,
    checksum               text not null check (checksum ~ '^[0-9a-f]{64}$'),
    bytes                  bigint not null check (bytes > 0),

    -- Extraction (ADR-0002).
    extraction_method      text not null check (extraction_method in ('text_layer', 'ocr')),
    extraction_backend     text not null,
    extraction_confidence  numeric(4, 3) not null check (extraction_confidence between 0 and 1),
    gibberish_lines_dropped integer not null default 0 check (gibberish_lines_dropped >= 0),

    -- Currency. A superseded document is never retrieved (ADR-0011).
    as_of                  text,
    superseded             boolean not null default false,
    superseded_note        text,

    -- Admission is a pipeline gate, not a review state (ADR-0012). Nothing is
    -- retrieved until a named person admits it.
    admission              text not null default 'queued'
                           check (admission in ('queued', 'admitted', 'rejected')),
    admission_by           text,
    admission_at           timestamptz,
    admission_note         text,
    compared_against_pdf   boolean not null default false,

    -- Exactly two review states, and the default is never 'verified'.
    review_state           text not null default 'ai_assisted_pending_review'
                           check (review_state in ('verified', 'ai_assisted_pending_review')),
    reviewed_by            text,
    reviewed_at            timestamptz,
    self_review            boolean,

    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),

    constraint documents_level_matches_class check (
        (doc_class = 'syllabus' and exam_level is not null and level_basis <> 'not_applicable')
        or (doc_class = 'reference' and exam_level is null and level_basis = 'not_applicable')
    ),
    constraint documents_admission_recorded check (
        admission = 'queued' or (admission_by is not null and admission_at is not null)
    ),
    -- ADR-0009: OCR output reaches no one until a person has compared it
    -- against the source PDF directly.
    constraint documents_ocr_needs_pdf_comparison check (
        admission <> 'admitted' or extraction_method <> 'ocr' or compared_against_pdf
    ),
    constraint documents_verified_recorded check (
        review_state <> 'verified'
        or (reviewed_by is not null and reviewed_at is not null and self_review is not null)
    ),
    constraint documents_verified_needs_admission check (
        review_state <> 'verified' or admission = 'admitted'
    )
);

create index documents_servable_idx on documents (exam_level, province)
    where admission = 'admitted' and not superseded;
