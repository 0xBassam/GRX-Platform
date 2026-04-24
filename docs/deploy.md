# Deploy

End-to-end setup needs external accounts you control. Once credentials
exist, `make bootstrap` handles everything locally; deployment is then a
one-click Vercel import.

## Accounts you need to create (one-time, ~15 minutes)

1. **Supabase** — https://supabase.com
   - Free tier is enough for this MVP.
   - Create a new project; pick the nearest region (e.g. `eu-central-1`).
   - Project Settings → Database → enable the `vector` extension.
   - Collect:
     - `SUPABASE_URL` (Project Settings → API → Project URL)
     - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role secret)
     - `SUPABASE_DB_URL` (Project Settings → Database → Connection string →
       URI, with your DB password filled in). Only used by `psql` for migrations.
2. **Anthropic** — https://console.anthropic.com
   - Billing required. Create an API key.
   - `ANTHROPIC_API_KEY`.
3. **OpenAI** — https://platform.openai.com
   - Billing required. Only used for `text-embedding-3-large`.
   - `OPENAI_API_KEY`.
4. **Vercel** — https://vercel.com (optional — for hosting the web app)
   - Connect GitHub → Import `0xBassam/GRX-Platform` → select branch
     `claude/grx-compliance-platform-6VrB6`.
   - Root Directory: `apps/web`.
   - Environment variables: copy the five from above plus `GRX_DEMO_MODE=1`.
   - Build settings auto-detect Next.js; no overrides needed.

## Why this repo doesn't auto-deploy

- Anthropic and OpenAI keys cost real money and are tied to a billing
  identity. I can't create them on your behalf.
- Supabase projects belong to an owner and are metered against their
  account. Same rule.
- Hosting (Vercel / Render / Fly) requires either an SSO login or a
  personal access token. Those stay with you.

If you want me to drive the deploy after you've created those accounts,
the fastest route is:

- Create the Supabase project + keys (steps 1–3 above).
- Put them in `.env` at the repo root, commit `.env.local` locally
  (or paste them in chat).
- Run `make bootstrap` once to push schema + ingest both PDFs + seed
  Demo Company. This is the only step that needs the Supabase DB URL.
- Push to GitHub and import into Vercel with the same five variables.

After that `pnpm tsx scripts/smoke.ts` against the deployed URL is the
release gate.

## Local-only rehearsal (no deploy)

If you want to demo on your laptop first:

```bash
cp .env.example .env
# fill the five secrets
make bootstrap             # migrations + ingestion + demo seed
GRX_DEMO_MODE=1 make dev   # http://localhost:3000
# in another terminal
cd apps/web && pnpm tsx scripts/smoke.ts
```

`scripts/smoke.ts` exits non-zero on any failure-criterion violation, so
it's a hard gate you can run before a live demo.

## What Vercel charges

Free tier covers this MVP's traffic comfortably. The AI cost lives on
Anthropic + OpenAI; ballpark under $200/month for heavy internal use (see
the main README).
