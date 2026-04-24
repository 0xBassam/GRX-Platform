# GRX Platform — Internal MVP

AI-powered compliance assistant for Saudi regulatory frameworks (NCA ECC +
PDPL). Not a chatbot: it explains controls, guides implementation, generates
audit-ready documentation, and highlights gaps with cited next actions.

## What it does

- **Knowledge-base ingestion** — Parses `Guide Ecc.pdf` (180 pages, ECC) and
  `Saudi regulation.pdf` (8 pages, PDPL) into structured `controls` rows +
  embedded `chunks` rows in Supabase Postgres with `pgvector`.
- **RAG chat** — Bilingual streaming chat (EN/AR) that answers questions
  about specific controls with a fixed structure: Control Summary →
  Explanation → Implementation Steps → Required Audit Evidence → Citations.
- **Strict grounding (hard guardrail)** — Every answer cites
  `[<FW> <code> · <source_file> · p.<page>]`. Unresolvable citations are
  rejected by the server; the assistant returns an exact EN or AR abstain
  string instead.
- **Retrieval invariant** — A query that mentions a control code pins that
  control ahead of semantic results, and the retriever asserts the exact
  control lands in the top-3.
- **Action buttons** — Chat answers surface "Generate Policy" buttons for
  each referenced control; the Insights view surfaces "Fix Missing
  Controls" that pipes selected gaps into the generator.
- **Policy generation** — Two-stage Claude Opus pipeline (outline →
  section drafting) produces Policies, Procedures, and Guidelines in the
  exact audit-ready section order (Purpose, Scope, Roles &
  Responsibilities, Policy Statements, [Procedures | Recommended
  Practices], Enforcement, Review Cycle, References). Exports DOCX and
  PDF with correct RTL/LTR styling per language.
- **Compliance insights** — Manual coverage tracking with per-control
  status, a domain dashboard, an AI "Suggest Next Actions" that lists up
  to 10 cited remediation actions grounded in the actual missing
  controls, and a "Fix Missing Controls" shortcut that generates a
  combined policy.
- **Demo Mode** — Preloaded EN/AR queries, a fictional Demo Company
  coverage profile, and a server-side cache. End-to-end walkthrough is
  designed to complete under 3 minutes.

## Architecture

```
apps/web/       Next.js 14 (App Router, TypeScript, Tailwind)
                API routes do RAG + generation. No separate server.
ingestion/      Python CLI (PyMuPDF + tiktoken + OpenAI) for PDF
                extraction, structural parsing, and embedding.
supabase/       SQL migrations + policy-template seeds.
docs/           Architecture, ingestion, prompt notes.
```

See `docs/architecture.md` for the layered diagram and retrieval pipeline.

## Stack

- **Frontend & API:** Next.js 14, TypeScript, Tailwind
- **Vector DB:** Supabase Postgres + `pgvector` (HNSW) + FTS (hybrid search
  via the `match_chunks` RPC)
- **LLM:** Anthropic Claude — `claude-sonnet-4-6` (chat, insights),
  `claude-opus-4-7` (policy drafting). Claude prompt caching on the
  system + preamble.
- **Embeddings:** OpenAI `text-embedding-3-large` (multilingual, 3072d)
- **PDF parsing:** PyMuPDF (with pdfplumber fallback available)
- **DOCX:** `docx` npm library; **PDF:** Puppeteer

## Prerequisites

- Node.js 20+ and pnpm 9+
- Python 3.11+
- A Supabase project (hosted or local) with the `vector` extension
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and Supabase credentials

## Setup

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL,
# SUPABASE_SERVICE_ROLE_KEY. Also set SUPABASE_DB_URL (a postgres://
# connection string) so `make migrate` can run psql.

make install           # web deps + ingestion deps
make migrate           # applies supabase/migrations/*
make ingest            # ingests both PDFs and embeds chunks
cd apps/web && pnpm tsx lib/demo/seed.ts   # optional: Demo Company coverage
make dev               # http://localhost:3000
```

## Demo Mode

```bash
GRX_DEMO_MODE=1 make dev
# Chat page shows preloaded EN + AR queries as one-click chips.
# Insights is pre-seeded by `lib/demo/seed.ts`.
```

Walkthrough (target under 3 minutes):
1. Chat → click **"What does ECC 1-1 require?"** — cited answer streams.
2. Click **"Generate Policy: 1-1"** in that answer → lands on /policies
   pre-populated.
3. Click **Generate Policy** → download DOCX (RTL for AR, LTR for EN).
4. Nav → **Insights** → select 3 missing controls → **Fix Missing
   Controls** → /policies opens with those codes → generate → DOCX.

## QA smoke test

After `make ingest`, run:

```bash
cd apps/web
pnpm tsx scripts/smoke.ts
```

Covers 10 cases (5 EN, 5 AR + 2 out-of-scope abstain checks). Fails if:

- Retrieval invariant is violated (top-3 must contain the exact control
  for code-bearing queries).
- Any cited answer is missing citations.
- An out-of-scope query produces anything other than the exact abstain
  string.

Ingestion has its own guardrails via `python ingestion/run.py verify`:

- ECC controls parsed ≥ 110 across ≥ 5 domains.
- ECC 2-3-2 has non-empty `requirement_en` and `source_page`.
- PDPL articles parsed ≥ 20.
- Chunks table non-empty per framework.

## Failure criteria (mapped to phases)

A phase is not complete if any of the following hold. These are encoded in
the smoke test and ingestion verify script.

| Criterion | Checked by |
| --- | --- |
| Missing/incorrect control mapping | `ingestion/run.py verify` |
| AI response without citations | `scripts/smoke.ts` (cases 1–8) |
| Incorrect language direction | manual DOM/DOCX check |
| Generated documents don't open | manual DOCX/PDF open in Word/reader |
| Retrieval fails to return correct control | `/api/search.invariantSatisfied` + smoke test |

## Implementation phases (shipped in order)

1. **Scaffold & infra** — Repo layout, Supabase schema (incl. hybrid
   `match_chunks` RPC), clients, bilingual i18n helpers.
2. **Ingestion** — Python CLI: extract → segment (ECC hierarchy + PDPL
   articles) → chunk → embed (OpenAI) → load (Supabase).
3. **Chat + RAG** — Hybrid retrieval with code-match pinning,
   `grounding.ts` citation validator, bilingual strict-grounding prompts,
   streaming SSE, action trailer.
4. **Policy generator** — Two-stage Claude Opus (outline → section
   drafting), DOCX + PDF renderers, `/policies` UI with action-button
   deep links.
5. **Compliance insights** — Coverage grid, stat cards, AI "Suggest Next
   Actions", "Fix Missing Controls" chain to the generator.
6. **Demo Mode, smoke tests, polish** — Preloaded queries, Demo Company
   coverage seeder, response cache, smoke-test harness, this README.

## Timeline & cost (indicative, internal MVP)

- **Timeline:** ~4 calendar weeks for one engineer end-to-end. Weeks 1–2
  are ingestion + RAG; week 3 is the generator; week 4 is insights, demo
  mode, and QA.
- **Runtime cost:** Supabase free tier + Vercel free tier cover the
  internal MVP. Anthropic + OpenAI usage budgets comfortably under
  US $200/month at expected internal volumes.
  - One-time embedding of both PDFs: well under US $1.
  - Per chat turn: ≈ US $0.01–0.03.
  - Per generated policy: ≈ US $0.10–0.25.
