-- The review queue (ADR-0009, ADR-0012). One open item per subject: a source
-- document, or a cached answer. Every decision is an event with a named actor,
-- so the history of who admitted or verified what, and whether it was
-- self-review, can never be lost by overwriting a column.

create table review_items (
    id           bigserial primary key,
    subject_kind text not null check (subject_kind in ('document', 'answer')),
    subject_id   text not null,
    opened_at    timestamptz not null default now(),
    status       text not null default 'open' check (status in ('open', 'closed')),
    github_issue integer,
    closed_at    timestamptz,
    constraint review_items_closed_recorded check (status = 'open' or closed_at is not null)
);

create unique index review_items_one_open_per_subject
    on review_items (subject_kind, subject_id)
    where status = 'open';

create table review_events (
    id                   bigserial primary key,
    review_item_id       bigint not null references review_items (id),
    action               text not null check (
        action in ('opened', 'admitted', 'rejected', 'verified', 'note', 'issue_linked')
    ),
    actor                text not null,
    self_review          boolean,
    compared_against_pdf boolean,
    note                 text not null default '',
    created_at           timestamptz not null default now()
);

create index review_events_item_idx on review_events (review_item_id);
