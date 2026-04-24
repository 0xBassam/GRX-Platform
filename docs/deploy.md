# Deployment notes

Detailed reference for the README runbook. Covers gotchas and
environment-variable semantics, not repetitive step lists.

## Environment variables

| Var | Required | Where used | Notes |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Vercel runtime | chat + policy generation |
| `OPENAI_API_KEY` | yes | Vercel runtime + ingestion | embeddings |
| `SUPABASE_URL` | yes | Vercel runtime + ingestion | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Vercel runtime + ingestion | **service_role**, not anon |
| `SUPABASE_DB_URL` | only for migrations | `psql` / GitHub Action | `postgres://` URI |
| `GRX_DEMO_MODE` | no | Vercel runtime | set to `1` to enable demo chips + Demo Company |
| `GRX_CHAT_MODEL` | no | Vercel runtime | default `claude-sonnet-4-6` |
| `GRX_POLICY_MODEL` | no | Vercel runtime | default `claude-opus-4-7` |
| `GRX_EMBEDDING_MODEL` | no | ingestion | default `text-embedding-3-large` |

## Why this repo can't fully self-deploy

- Anthropic and OpenAI keys cost real money and are tied to a billing
  identity — the account owner must create them.
- Supabase projects belong to an owner and are metered against their
  account.
- Vercel deploys require either GitHub-linked SSO or a personal access
  token — both are user-scoped.

The repo therefore stops at **one-click import** and **one-click
ingestion workflow**. You click two buttons and paste five secrets.

## PDF export on Vercel

`lib/docgen/pdf.ts` detects `process.env.VERCEL` and switches between:

- **Local:** `puppeteer-core` + whatever Chrome is on the machine. Set
  `PUPPETEER_EXECUTABLE_PATH` if autodiscovery fails.
- **Vercel:** `puppeteer-core` + `@sparticuz/chromium`. Chromium is
  loaded from the layer at cold start; first invocation is slow (~5s)
  but subsequent calls are fast. `maxDuration` on the export routes is
  set to 60s in `apps/web/vercel.json`.

If you ever see `Protocol error (Target.setAutoAttach)` on Vercel, it's
almost always a `@sparticuz/chromium` version mismatch with
`puppeteer-core`. Pin both in lockstep.

## Ingestion on GitHub Actions

The `Ingest knowledge base` workflow runs PyMuPDF + OpenAI embedding +
Supabase insert in CI. Runtime is ~2 minutes. Total cost on the first
run is under US$1 at current OpenAI pricing.

`Apply migrations` input applies `0001_init.sql` and
`0002_seed_frameworks.sql` with `psql` before ingestion — convenient on
the first run, unnecessary on subsequent runs.

## Re-ingesting

The loader is idempotent per framework: it upserts controls by
(framework_id, code) and *replaces* every chunk for that framework in
one transaction. Re-running the workflow is safe and recommended after:

- a parser tweak in `ingestion/segment.py`,
- a new PDF version,
- changes to `ingestion/chunk.py` that alter chunk boundaries.

## Rotating secrets

- Anthropic/OpenAI: rotate in each provider's console, then update the
  Vercel env var. Vercel redeploys the current commit automatically when
  an env var changes.
- Supabase: if you rotate the service-role key, update Vercel + every
  GitHub repository secret (`SUPABASE_SERVICE_ROLE_KEY`).

## Local rehearsal

```bash
cp .env.example .env
# fill the five secrets
make bootstrap             # migrations + ingestion + demo seed
GRX_DEMO_MODE=1 make dev   # http://localhost:3000
# in another terminal
cd apps/web && pnpm tsx scripts/smoke.ts
```

## Costs once live

- Supabase free tier: fine for a single-tenant internal MVP.
- Vercel free (Hobby) tier: fine for demos; bumps to Pro if you want
  `maxDuration > 60s` or higher concurrency.
- Anthropic + OpenAI: ~US$200/month upper bound for heavy internal use.
