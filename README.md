# GRX Platform — Internal MVP

AI-powered compliance assistant for Saudi regulatory frameworks (NCA ECC +
PDPL). Not a chatbot: it explains controls, guides implementation, generates
audit-ready documentation, and highlights gaps with cited next actions.

**[One-click deploy to Vercel →](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F0xBassam%2FGRX-Platform&root-directory=apps%2Fweb&env=ANTHROPIC_API_KEY,OPENAI_API_KEY,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,GRX_DEMO_MODE&envDescription=ANTHROPIC%20and%20OPENAI%20keys%20plus%20Supabase%20URL%20%2B%20service-role%20key.%20Set%20GRX_DEMO_MODE%3D1%20to%20ship%20with%20demo%20chips%20%2B%20Demo%20Company%20seed.&envLink=https%3A%2F%2Fgithub.com%2F0xBassam%2FGRX-Platform%2Fblob%2Fclaude%2Fgrx-compliance-platform-6VrB6%2Fdocs%2Fdeploy.md&project-name=grx-platform&repository-name=grx-platform)**

Follow the runbook below for the full flow (provision → migrate → ingest →
deploy → verify).

---

## What it does

- **Knowledge-base ingestion** — Parses `Guide Ecc.pdf` (180 pages, ECC)
  and `Saudi regulation.pdf` (8 pages, PDPL) into structured `controls`
  rows + embedded `chunks` rows in Supabase Postgres with `pgvector`.
- **RAG chat** — Bilingual streaming chat (EN/AR) that answers questions
  about specific controls with a fixed structure: Control Summary →
  Explanation → Implementation Steps → Required Audit Evidence → Citations.
- **Strict grounding (hard guardrail)** — Every answer cites
  `[<FW> <code> · <source_file> · p.<page>]`. Unresolvable citations are
  rejected by the server; the assistant returns an exact EN or AR abstain
  string instead.
- **Retrieval invariant** — A query that mentions a control code pins
  that control ahead of semantic results; the retriever asserts the exact
  control lands in the top-3.
- **Action buttons** — Chat answers surface **"Generate Policy"** buttons
  for each referenced control; the Insights view surfaces **"Fix Missing
  Controls"** that pipes selected gaps into the generator.
- **Policy generation** — Two-stage Claude Opus pipeline produces
  Policies, Procedures, and Guidelines in the required audit-ready order
  (Purpose, Scope, Roles & Responsibilities, Policy Statements,
  [Procedures | Recommended Practices], Enforcement, Review Cycle,
  References). Exports DOCX and PDF with correct RTL/LTR styling.
- **Compliance insights** — Manual coverage tracking, per-domain
  dashboard, AI "Suggest Next Actions" (cited, grounded), and "Fix
  Missing Controls" that chains into the generator.
- **Demo Mode** — Preloaded EN/AR queries, a Demo Company coverage
  profile, and a server-side response cache. End-to-end walkthrough
  designed to complete under 3 minutes.

---

## Architecture

```
apps/web/       Next.js 14 (App Router, TypeScript, Tailwind)
                API routes do RAG + generation. No separate server.
ingestion/      Python CLI (PyMuPDF + tiktoken + OpenAI) for PDF
                extraction, structural parsing, and embedding.
supabase/       SQL migrations + policy-template seeds.
docs/           Architecture, ingestion, prompts, deploy notes.
.github/        Ingestion + smoke-test workflows.
```

See `docs/architecture.md` for the layered diagram and retrieval pipeline.

## Stack

- **Frontend & API:** Next.js 14, TypeScript, Tailwind
- **Vector DB:** Supabase Postgres + `pgvector` (HNSW) + FTS
  (hybrid search via the `match_chunks` RPC)
- **LLM:** Anthropic Claude — `claude-sonnet-4-6` (chat, insights),
  `claude-opus-4-7` (policy drafting). Prompt caching on the system +
  preamble.
- **Embeddings:** OpenAI `text-embedding-3-large` (multilingual, 3072d)
- **PDF parsing:** PyMuPDF (with pdfplumber fallback available)
- **DOCX:** `docx` npm library
- **PDF export:** `puppeteer-core` + `@sparticuz/chromium` (works both
  locally and in Vercel's serverless functions).

---

## Deployment runbook (step-by-step)

Follow these in order. Everything runs out of one GitHub repo; the only
manual provisioning is creating the three SaaS accounts in step 1.

### 1. Create the external accounts (one-time, ~15 min)

| Service | Where | What you need | Why |
| --- | --- | --- | --- |
| Supabase | https://supabase.com | new project + `vector` ext enabled | Postgres + pgvector store |
| Anthropic | https://console.anthropic.com | API key | chat + policy drafting |
| OpenAI | https://platform.openai.com | API key | embeddings only (3-large) |
| Vercel | https://vercel.com | GitHub-linked account | hosting Next.js |

In Supabase, after creating the project:

- Project Settings → Database → Extensions → enable **`vector`** (already
  on by default in recent Supabase projects).
- Project Settings → API → copy **Project URL** and **`service_role`
  secret** (not the `anon` key).
- Project Settings → Database → Connection string → **URI** → copy (and
  replace `[YOUR-PASSWORD]` with the database password). This is only
  used by `psql`/GitHub Actions to apply migrations.

### 2. Apply Supabase migrations

Pick one:

**A. From your laptop** (simpler if you have `psql`):
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_seed_frameworks.sql
```

**B. From the Supabase dashboard** (no local tools needed):
- Dashboard → SQL Editor → New query → paste the contents of
  `supabase/migrations/0001_init.sql` → Run.
- Repeat for `0002_seed_frameworks.sql`.

**C. Via GitHub Actions** (see step 4; `Apply migrations` is a checkbox
on the workflow trigger).

### 3. Push code to GitHub

The code already lives on branch
`claude/grx-compliance-platform-6VrB6` in `0xBassam/GRX-Platform`. To
make it the default deploy target for Vercel:

```bash
# If you want to promote this branch to main:
git checkout main
git merge --ff-only claude/grx-compliance-platform-6VrB6
git push origin main
```

(Vercel can also deploy directly from any branch — you pick the branch in
the Vercel project settings.)

### 4. Ingest the PDFs

This step turns the two committed PDFs into rows in Supabase. Pick one:

**A. GitHub Actions (no local setup).**
1. In the repo → **Settings → Secrets and variables → Actions → New
   repository secret** and add:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`
2. **Actions tab → "Ingest knowledge base" → Run workflow**. Keep
   "Apply migrations" checked on the first run. The workflow logs will
   print the control counts and the `verify` checks.

**B. Locally.**
```bash
cp .env.example .env     # fill in ANTHROPIC/OPENAI/SUPABASE values
make bootstrap           # installs deps, applies migrations, ingests both PDFs
```

### 5. Deploy to Vercel

**Option A — one-click (recommended):** click the badge at the top of
this README. The Import flow:
1. Connects your GitHub to Vercel (skipped if already connected).
2. Forks or links `0xBassam/GRX-Platform` (keep the existing repo).
3. Pre-fills **Root Directory** = `apps/web` and **Framework** = Next.js.
4. Prompts for env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GRX_DEMO_MODE`).
5. Hits **Deploy**.

**Option B — manual import:**
1. vercel.com → **Add New… → Project → Import Git Repository →**
   `0xBassam/GRX-Platform`.
2. Project Settings → **Root Directory** = `apps/web`. Framework Preset
   auto-detects Next.js.
3. Environment Variables (add for Production + Preview):
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GRX_DEMO_MODE` = `1` (turns on preloaded chips + Demo Company)
   - `GRX_CHAT_MODEL` (optional) = `claude-sonnet-4-6`
   - `GRX_POLICY_MODEL` (optional) = `claude-opus-4-7`
   - `GRX_EMBEDDING_MODEL` (optional) = `text-embedding-3-large`
4. Deploy.

The monorepo configuration lives in `apps/web/vercel.json` — it sets
`maxDuration` on the generator, export, chat, and insights routes so
long Claude calls don't time out.

### 6. Verify the deployment

**From your laptop:**
```bash
cd apps/web
GRX_BASE_URL=https://<your-vercel-url> pnpm tsx scripts/smoke.ts
```

**Via GitHub Actions:** Actions tab → **"Smoke test deployed URL"** →
Run workflow → paste your Vercel URL.

Smoke test exits non-zero on any of:
- retrieval top-3 missing target control for code-bearing queries,
- chat answer missing citations,
- out-of-scope query returning anything other than the exact abstain
  string.

A green smoke run is the release gate.

---

## Updating the deployment later

- **Code changes:** push to the branch Vercel watches → Vercel
  auto-deploys.
- **Knowledge base change (new PDFs):** replace the files in the repo
  root, commit, then run the **"Ingest knowledge base"** workflow.
  Ingestion is idempotent — re-running wipes and reloads chunks for that
  framework.
- **Prompt tweaks:** edit `apps/web/lib/rag/prompts.ts` or
  `apps/web/lib/docgen/templates.ts` → push → deploy.
- **New model:** update the three `GRX_*_MODEL` env vars in Vercel.

---

## Demo walkthrough (under 3 minutes)

With `GRX_DEMO_MODE=1`:

1. Chat → click preloaded chip **"What does ECC 1-1 require?"**. Cited
   answer streams.
2. Click the **"Generate Policy: 1-1"** button in that answer → lands on
   `/policies` with the control pre-selected.
3. Click **Generate Policy** → download DOCX (and/or PDF).
4. Nav → **Insights** → check 3 controls in the "missing" or "partial"
   list → click **"Fix Missing Controls"** → `/policies` opens
   pre-populated with those codes → generate → download.

---

## Failure criteria (QA gate)

| Criterion | Checked by |
| --- | --- |
| Missing/incorrect control mapping | `ingestion/run.py verify` |
| AI response without citations | `scripts/smoke.ts` (cases 1–8) |
| Incorrect language direction | manual DOM/DOCX check |
| Generated documents don't open | manual DOCX/PDF open in Word/reader |
| Retrieval fails to return correct control | `/api/search.invariantSatisfied` + smoke test |

---

## Timeline & cost (internal MVP estimate)

- **Timeline:** ~4 calendar weeks for one engineer end-to-end.
  - Week 1: scaffold + ingestion
  - Week 2: chat + RAG
  - Week 3: policy generator
  - Week 4: insights + demo mode + QA
- **Runtime cost:** Supabase free tier + Vercel free tier cover the
  internal MVP. Anthropic + OpenAI usage comfortably under US$200/month
  at expected internal volumes.
  - One-time embedding of both PDFs: well under US$1.
  - Per chat turn: ≈ US$0.01–0.03.
  - Per generated policy: ≈ US$0.10–0.25.
