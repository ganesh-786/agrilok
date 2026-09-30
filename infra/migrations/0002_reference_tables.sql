-- Reference data: exam levels, provinces, service groups, document types.
-- Rows live in infra/seed/reference_data.sql, not here, because the source
-- landscape moves (infra/README.md): a renamed group is a seed change, not a
-- schema change.

-- The product covers exactly two exams. The check is the schema-level half of
-- "Level 4 and Level 7 never mix": a third level cannot be inserted by
-- accident, and every table that references exam_levels inherits that.
create table exam_levels (
    code       text primary key check (code in ('level_4', 'level_7')),
    name_en    text not null,
    name_ne    text not null,
    post_en    text not null,
    post_ne    text not null,
    sort_order integer not null
);

create table provinces (
    code       text primary key,
    name_en    text not null,
    name_ne    text not null,
    sort_order integer not null
);

create table service_groups (
    code       text primary key,
    name_en    text not null,
    name_ne    text not null,
    sort_order integer not null
);

create table doc_types (
    code    text primary key,
    name_en text not null,
    name_ne text not null
);
