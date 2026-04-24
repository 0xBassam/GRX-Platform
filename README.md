# GRX Platform — Internal MVP

AI-powered compliance assistant for Saudi regulatory frameworks (NCA ECC + PDPL).
Not a chatbot: it explains controls, guides implementation, generates audit-ready
documentation, and highlights gaps with cited next actions.

## What it does

- **Knowledge base ingestion** — Parses the uploaded `Guide Ecc.pdf` and
  `Saudi regulation.pdf` into structured controls + chunks with bilingual
  (EN/AR) text and stores them in Supabase Postgres with `pgvector`.
- **RAG chat** — Bilingual streaming chat that answers questions about
  specific controls with a fixed structure (Summary → Explanation →
  Implementation Steps → Required Audit Evidence → Citations).
- **Strict grounding** — Every answer cites the source control + filename +
  page. Unresolvable citations are rejected; the assistant abstains instead.
- **Policy generation** — Produces Policies, Procedures, and Guidelines as
  DOCX and PDF with the required audit structure (Purpose, Scope, Roles &
  Responsibilities, Policy Statements, Enforcement, Review Cycle, References).
- **Compliance insights** — Manual coverage tracking plus an AI "Suggest Next
  Actions" and "Fix Missing Controls" flow.
- **Demo Mode** — Preloaded queries, a fictional "Demo Company" profile, and
  cached fast paths so a full walkthrough runs in under 3 minutes.

## Architecture

```
apps/web/       Next.js 14 (App Router, TypeScript, Tailwind)
                API routes do the RAG + generation. No separate server.
ingestion/      Python CLI for PDF extraction + structural parsing +
                embedding. Writes directly to Supabase.
supabase/       SQL migrations (pgvector, tables, indexes, FTS) and
                seed data.
docs/           Architecture notes, ingestion notes, prompt designs.
```

## Stack

- **Frontend & API:** Next.js 14, TypeScript, Tailwind, shadcn/ui
- **Vector DB:** Supabase Postgres + `pgvector` (HNSW) + FTS for hybrid search
- **LLM:** Anthropic Claude (Sonnet 4.6 for chat, Opus 4.7 for policy drafts)
- **Embeddings:** OpenAI `text-embedding-3-large` (multilingual)
- **PDF parsing:** PyMuPDF + pdfplumber (Python)
- **DOCX:** `docx` npm library; **PDF:** Puppeteer

## Prerequisites

- Node.js 20+ and pnpm 9+
- Python 3.11+
- Supabase project (hosted or local) with the `vector` extension
- `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`

## Setup

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_DB_URL for migrations.

make install           # installs web + ingestion deps
make migrate           # applies supabase/migrations/*
make ingest            # ingests both PDFs
make dev               # starts Next.js on http://localhost:3000
```

## Demo Mode

```bash
GRX_DEMO_MODE=1 make dev
# then visit http://localhost:3000 — the chat page shows preloaded EN/AR
# sample queries. Insights is pre-seeded with a Demo Company.
```

## Implementation phases

Each phase lands as a commit on `claude/grx-compliance-platform-6VrB6`.

1. **Scaffold & infra** — repo layout, Supabase schema, env, clients. *(this commit)*
2. **Ingestion pipeline** — Python CLI + structural parser + embeddings.
3. **Chat + RAG** — hybrid retrieval with code-match pinning, strict grounding, streaming.
4. **Policy generator** — two-stage Claude pipeline, DOCX + PDF, action buttons from chat.
5. **Compliance insights** — manual status + AI Suggest Next Actions + Fix Missing Controls.
6. **Demo Mode, polish, QA gates** — preloaded queries, cache, smoke tests.

## Timeline & cost (internal MVP estimate)

- **Timeline:** ~4 calendar weeks for one engineer end-to-end.
  - Week 1: Phases 1–2
  - Week 2: Phase 3
  - Week 3: Phase 4
  - Week 4: Phases 5–6
- **Runtime cost:** Supabase free tier and Vercel free tier cover the internal
  MVP. Anthropic + OpenAI usage budgets comfortably under $200/month for
  internal testing. One-time embedding of both PDFs is well under $1. Per chat
  query ≈ $0.01–0.03. Per generated policy ≈ $0.10–0.25.
