# GRX — Static Demo

Public read-only preview of the GRX UI. Runs entirely in the browser:

- No API keys.
- No backend.
- No live AI.

Mocked everything: chat answers, policy generation, coverage data,
"Suggest Next Actions". Same UI, RTL/LTR, demo chips, action buttons,
and citation pills as the full version.

This app exists so the platform can be shown publicly while the live
version (`apps/web`, on Vercel) is gated by API keys and Supabase
provisioning.

## Local development

```bash
pnpm install
pnpm dev      # http://localhost:3001
```

## Static build

```bash
pnpm build           # outputs to apps/demo/out
npx serve out        # serve the static export locally
```

`next.config.mjs` sets `output: "export"` and `basePath` so the build
deploys cleanly to GitHub Pages at `/<repo-name>/`. Override
`NEXT_PUBLIC_BASE_PATH` when running locally without a basePath:

```bash
NEXT_PUBLIC_BASE_PATH= pnpm dev
```

## Deploy to GitHub Pages

The workflow at `.github/workflows/pages.yml` builds and publishes on
every push to `main` or `claude/grx-compliance-platform-6VrB6` that
touches `apps/demo/**`.

One-time setup:

1. **Repo Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. (Optional) **Repo Settings → Variables → New repository variable:**
   `NEXT_PUBLIC_BASE_PATH` if your repo name differs from `GRX-Platform`,
   or empty string for a CNAME.
3. Push or run the workflow manually (Actions → "Deploy static demo to
   GitHub Pages" → Run workflow).

After the first successful run the URL appears in the workflow summary
and on the Settings → Pages page. Default URL:

```
https://<github-owner>.github.io/<repo-name>/
```

For `0xBassam/GRX-Platform` that's
`https://0xbassam.github.io/GRX-Platform/`.

## What's mocked

| Surface | Mock source |
| --- | --- |
| Chat answers | `lib/mocks/chat.ts` (4 EN + 4 AR canned responses, code-aware fallback) |
| Policy generator | `lib/mocks/policies.ts` (templated Markdown, downloadable as MD or HTML) |
| Insights coverage | `lib/mocks/insights.ts` (deterministic "Demo Company" status mix) |
| Suggest Next Actions | `lib/mocks/insights.ts` (formatted from the gap set) |
| Controls catalog | `lib/mocks/controls.ts` (5 ECC domains + 14 subdomains + ECC 2-3-2 + 6 PDPL articles) |

The chat fallback is code-aware: any query containing a recognised ECC
or PDPL code (e.g. `2-1`, `Art.18`) gets a templated stub with a
matching citation, so the demo never collapses to abstain on unknown
text.

## Switching back to the live version

This app is purely additive — the live app at `apps/web` is unaffected.
When you wire up Supabase + Vercel, point users there; this static demo
can stay published as a marketing/preview surface.
