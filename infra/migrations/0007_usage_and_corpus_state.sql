-- Quota governor state, aggregate usage metrics and the corpus revision.
--
-- None of these tables may ever hold personal data (docs/privacy.md). They are
-- counts per day, nothing else.

-- Model calls counted against the configured daily ceilings (ADR-0004). The
-- day is the provider's quota day, which resets at midnight Pacific time, so
-- that our ceiling and theirs roll over together.
create table quota_usage (
    day   date not null,
    kind  text not null check (kind in ('generate', 'embed')),
    count integer not null default 0 check (count >= 0),
    primary key (day, kind)
);

-- Cache hit rate and quota burn are first-class metrics (ADR-0004,
-- "Verification"). Day in Asia/Kathmandu, for humans reading it.
create table usage_daily (
    day    date not null,
    metric text not null,
    count  bigint not null default 0 check (count >= 0),
    primary key (day, metric)
);

-- Bumped whenever the set of retrievable documents changes. A cached refusal is
-- only reused at the revision it was made at, because a newly admitted
-- document may answer what used to be refused.
create table corpus_state (
    id         smallint primary key default 1 check (id = 1),
    revision   bigint not null default 0,
    updated_at timestamptz not null default now()
);

insert into corpus_state (id, revision) values (1, 0);
