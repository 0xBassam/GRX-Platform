// One-shot CLI to populate the Demo Company coverage and pre-warm the
// chat response cache for every preloaded query.
//
// Usage (from apps/web): `pnpm tsx lib/demo/seed.ts`

import { seedDemoCompany } from "./company";
import { allDemoQueries } from "./queries";

async function warmCache() {
  // We hit our own /api/chat as a regular client would. This populates the
  // in-process Map in lib/demo/cache.ts — which means warming is useful
  // only for the process that serves the first preview. For production
  // demos run this once against the same Node server instance that will
  // answer the preloaded clicks.
  const base = process.env.GRX_BASE_URL ?? "http://localhost:3000";
  for (const { query, language } of allDemoQueries()) {
    // Read back the full SSE response so we populate the server cache.
    const resp = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: query, language }),
    });
    if (!resp.ok || !resp.body) {
      console.warn(`warm: ${language} ${query} -> ${resp.status}`);
      continue;
    }
    const reader = resp.body.getReader();
    // Drain. The server's /api/chat does not currently write to the cache
    // on miss; treat this as a best-effort rehearsal loop.
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    console.log(`warmed: ${language} ${query}`);
  }
}

async function main() {
  const company = process.env.GRX_DEMO_SKIP_COMPANY === "1" ? 0 : await seedDemoCompany("ECC");
  console.log(`Seeded Demo Company coverage on ${company} controls.`);
  if (process.env.GRX_DEMO_WARM === "1") {
    await warmCache();
  } else {
    console.log("Skipping chat warm-up (set GRX_DEMO_WARM=1 to enable).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
