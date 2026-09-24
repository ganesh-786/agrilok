-- Answers, which double as the cache (ADR-0004). A live or pre-generated
-- answer is stored once and served to every sufficiently similar question.
--
-- A cached wrong answer reaches everyone (ADR-0004, "Bad"), so every answer
-- carries its own review state, and an answer is invalidated when a document
-- it cites changes (cited_documents holds the checksum each citation was made
-- against).

create table answers (
    id                 text primary key,     -- short random id, used in permalinks
    exam_level         text not null references exam_levels (code),
    province           text references provinces (code),
    service_group      text references service_groups (code),

    question           text not null,
    question_norm      text not null,
    question_hash      text not null check (question_hash ~ '^[0-9a-f]{64}$'),
    question_embedding vector(768),

    status             text not null check (status in ('answered', 'refused')),
    refusal_stage      text check (
        refusal_stage in ('no_sources', 'model_insufficient', 'support_check', 'blocked')
    ),
    answer_text        text,                 -- with [n] citation markers
    citations          jsonb not null default '[]'::jsonb,
    consulted          jsonb not null default '[]'::jsonb,
    support_check      jsonb,
    -- An answer the support check stopped. For reviewers only, never served.
    withheld_answer    text,

    model              text,
    prompt_version     text not null,
    corpus_revision    bigint not null,
    cited_documents    jsonb not null default '{}'::jsonb,
    origin             text not null check (origin in ('live', 'pregenerated')),

    review_state       text not null default 'ai_assisted_pending_review'
                       check (review_state in ('verified', 'ai_assisted_pending_review')),
    reviewed_by        text,
    reviewed_at        timestamptz,
    self_review        boolean,

    served_count       integer not null default 1 check (served_count >= 1),
    last_served_at     timestamptz not null default now(),
    created_at         timestamptz not null default now(),
    invalidated_at     timestamptz,
    invalidated_reason text,

    -- ADR-0003: never an answer without citations.
    constraint answers_answered_has_citations check (
        status <> 'answered' or (answer_text is not null and jsonb_array_length(citations) > 0)
    ),
    constraint answers_refused_has_stage check (status <> 'refused' or refusal_stage is not null),
    constraint answers_verified_recorded check (
        review_state <> 'verified'
        or (reviewed_by is not null and reviewed_at is not null and self_review is not null)
    ),
    constraint answers_only_answered_can_be_verified check (
        review_state <> 'verified' or status = 'answered'
    )
);

create index answers_hash_idx on answers (question_hash) where invalidated_at is null;
create index answers_scope_idx on answers (exam_level, province, service_group)
    where invalidated_at is null;
