-- GRX Platform — initial schema
-- pgvector + hybrid search (vector + FTS) + code-match pinning support.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Frameworks: ECC, PDPL, ... (extensible)
-- ---------------------------------------------------------------------------
create table if not exists frameworks (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title_en text not null,
  title_ar text not null,
  version text,
  source_document text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Hierarchical controls (domain → subdomain → control → sub-control)
-- level: 1=domain, 2=subdomain, 3=control, 4=sub-control
-- code: '1', '1-1', '1-1-1', '2-3-2', or PDPL article numbers like 'Art.5'
-- ---------------------------------------------------------------------------
create table if not exists controls (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references frameworks(id) on delete cascade,
  code text not null,
  parent_id uuid references controls(id) on delete set null,
  level int not null check (level between 1 and 4),
  title_en text,
  title_ar text,
  objective_en text,
  objective_ar text,
  requirement_en text,
  requirement_ar text,
  audit_evidence_en text,
  audit_evidence_ar text,
  source_page int,
  created_at timestamptz not null default now(),
  unique (framework_id, code)
);

create index if not exists controls_parent_idx on controls(parent_id);
create index if not exists controls_framework_code_idx on controls(framework_id, code);

-- ---------------------------------------------------------------------------
-- Raw chunks for semantic retrieval.
-- tsvector stores a full-text index over the chunk content for hybrid search.
-- embedding: 3072 dims for OpenAI text-embedding-3-large.
-- ---------------------------------------------------------------------------
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references frameworks(id) on delete cascade,
  control_id uuid references controls(id) on delete set null,
  language text not null check (language in ('en', 'ar')),
  content text not null,
  tokens int,
  source_file text not null,
  source_page int,
  embedding vector(3072),
  tsv tsvector generated always as (to_tsvector('simple', coalesce(content, ''))) stored,
  created_at timestamptz not null default now()
);

create index if not exists chunks_embedding_hnsw_idx
  on chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_tsv_gin_idx
  on chunks using gin (tsv);

create index if not exists chunks_control_idx on chunks(control_id);
create index if not exists chunks_framework_idx on chunks(framework_id);
create index if not exists chunks_lang_idx on chunks(language);

-- ---------------------------------------------------------------------------
-- Policy generation history (so users can re-download).
-- ---------------------------------------------------------------------------
create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('policy', 'procedure', 'guideline')),
  title text not null,
  language text not null check (language in ('en', 'ar')),
  control_codes text[] not null default '{}',
  markdown text not null,
  docx_path text,
  pdf_path text,
  created_at timestamptz not null default now()
);

create index if not exists generated_documents_created_idx
  on generated_documents(created_at desc);

-- ---------------------------------------------------------------------------
-- User-declared coverage for gap awareness.
-- ---------------------------------------------------------------------------
create table if not exists coverage_status (
  control_id uuid primary key references controls(id) on delete cascade,
  status text not null check (status in ('implemented', 'partial', 'missing', 'not_applicable')),
  note text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RPC: hybrid search with code-match pinning.
-- Inputs:
--   query_embedding  — 3072-dim vector from OpenAI text-embedding-3-large
--   query_text       — raw text for FTS (optional)
--   pinned_codes     — explicit control codes to pin at rank 1 (e.g. '1-1')
--   k                — number of final results to return (default 8)
-- Returns top-k chunks with combined score = RRF(semantic, fts) with pinned
-- code matches prepended. This is the core retriever called by the TS layer.
-- ---------------------------------------------------------------------------
create or replace function match_chunks(
  query_embedding vector(3072),
  query_text text default '',
  pinned_codes text[] default '{}',
  framework_codes text[] default '{}',
  languages text[] default array['en','ar'],
  k int default 8
)
returns table (
  id uuid,
  framework_id uuid,
  framework_code text,
  control_id uuid,
  control_code text,
  language text,
  content text,
  source_file text,
  source_page int,
  score float,
  reason text
)
language plpgsql stable
as $$
begin
  return query
  with
    framework_filter as (
      select f.id, f.code
      from frameworks f
      where cardinality(framework_codes) = 0 or f.code = any(framework_codes)
    ),
    -- Pinned code matches: any chunk belonging to a control whose code is in
    -- pinned_codes. Score = 2.0 so they always beat RRF (which caps ~1.0).
    pinned as (
      select c.id, c.framework_id, c.control_id, c.language, c.content,
             c.source_file, c.source_page, 2.0::float as score,
             'code_match'::text as reason
      from chunks c
      join controls ct on ct.id = c.control_id
      join framework_filter ff on ff.id = c.framework_id
      where cardinality(pinned_codes) > 0
        and ct.code = any(pinned_codes)
        and c.language = any(languages)
    ),
    -- Semantic top-24 via cosine similarity.
    semantic as (
      select c.id, c.framework_id, c.control_id, c.language, c.content,
             c.source_file, c.source_page,
             1 - (c.embedding <=> query_embedding) as sim,
             row_number() over (order by c.embedding <=> query_embedding asc) as rnk
      from chunks c
      join framework_filter ff on ff.id = c.framework_id
      where c.embedding is not null
        and c.language = any(languages)
      order by c.embedding <=> query_embedding asc
      limit 24
    ),
    -- FTS top-24. Empty query_text → no rows.
    fts as (
      select c.id, c.framework_id, c.control_id, c.language, c.content,
             c.source_file, c.source_page,
             ts_rank(c.tsv, plainto_tsquery('simple', query_text)) as rank,
             row_number() over (
               order by ts_rank(c.tsv, plainto_tsquery('simple', query_text)) desc
             ) as rnk
      from chunks c
      join framework_filter ff on ff.id = c.framework_id
      where query_text <> ''
        and c.tsv @@ plainto_tsquery('simple', query_text)
        and c.language = any(languages)
      order by rank desc
      limit 24
    ),
    -- Reciprocal Rank Fusion. k0 = 60 is the standard RRF constant.
    fused as (
      select id, framework_id, control_id, language, content, source_file, source_page,
             sum(score) as score,
             string_agg(reason, ',') as reason
      from (
        select id, framework_id, control_id, language, content, source_file, source_page,
               1.0 / (60 + rnk) as score,
               'semantic' as reason
        from semantic
        union all
        select id, framework_id, control_id, language, content, source_file, source_page,
               1.0 / (60 + rnk) as score,
               'fts' as reason
        from fts
      ) s
      group by id, framework_id, control_id, language, content, source_file, source_page
    ),
    combined as (
      select p.id, p.framework_id, p.control_id, p.language, p.content,
             p.source_file, p.source_page, p.score, p.reason
      from pinned p
      union all
      select f.id, f.framework_id, f.control_id, f.language, f.content,
             f.source_file, f.source_page, f.score, f.reason
      from fused f
      where not exists (select 1 from pinned p where p.id = f.id)
    )
  select
    co.id,
    co.framework_id,
    fw.code as framework_code,
    co.control_id,
    ct.code as control_code,
    co.language,
    co.content,
    co.source_file,
    co.source_page,
    co.score,
    co.reason
  from combined co
  left join frameworks fw on fw.id = co.framework_id
  left join controls ct on ct.id = co.control_id
  order by co.score desc
  limit k;
end;
$$;
