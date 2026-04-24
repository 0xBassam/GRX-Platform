// End-to-end QA smoke test harness. Maps directly to the failure criteria
// in the approved plan.
//
// Run from apps/web/:
//   GRX_BASE_URL=http://localhost:3000 pnpm tsx scripts/smoke.ts
//
// Exits non-zero on any failure so it can gate a release.

type SearchResp = {
  pinnedCodes: string[];
  invariantSatisfied: boolean;
  results: {
    framework: string;
    control: string | null;
    language: "en" | "ar";
    page: number | null;
    score: number;
  }[];
};

type ChatEvent =
  | { event: "meta"; data: { pinnedCodes: string[] } }
  | { event: "delta"; data: { delta: string } }
  | {
      event: "done";
      data: {
        actions?: { generate_policy: string[] };
        grounding?: { ok: boolean; citations?: string[] };
        reject?: boolean;
        replacement?: string;
        clean?: string;
      };
    }
  | { event: "error"; data: { error: string } };

const BASE = process.env.GRX_BASE_URL ?? "http://localhost:3000";

const ABSTAIN_EN =
  "I could not find sufficient information in the uploaded knowledge base.";
const ABSTAIN_AR =
  "لم أتمكن من العثور على معلومات كافية في قاعدة المعرفة التي تم تحميلها.";

type Case = {
  name: string;
  query: string;
  language: "en" | "ar";
  // When set, the retriever must return this control in the top-3.
  mustReturnControlInTop3?: string;
  // When true, the assistant must produce at least one citation.
  mustCite?: boolean;
  // When true, the assistant is expected to abstain.
  mustAbstain?: boolean;
};

const CASES: Case[] = [
  {
    name: "EN: ECC 1-1 exact",
    query: "What does ECC 1-1 require?",
    language: "en",
    mustReturnControlInTop3: "1-1",
    mustCite: true,
  },
  {
    name: "EN: cyber strategy (topical)",
    query: "Explain cybersecurity strategy controls",
    language: "en",
    mustCite: true,
  },
  {
    name: "EN: access control evidence",
    query: "What evidence is required for access control?",
    language: "en",
    mustCite: true,
  },
  {
    name: "EN: PDPL data subjects",
    query: "Summarize PDPL obligations for data subjects",
    language: "en",
    mustCite: true,
  },
  {
    name: "AR: الضابط 1-1",
    query: "ماذا يتطلب الضابط 1-1؟",
    language: "ar",
    mustReturnControlInTop3: "1-1",
    mustCite: true,
  },
  {
    name: "AR: استراتيجية الأمن",
    query: "اشرح ضوابط استراتيجية الأمن السيبراني",
    language: "ar",
    mustCite: true,
  },
  {
    name: "AR: أدلة التحكم في الوصول",
    query: "ما الأدلة المطلوبة لضوابط التحكم في الوصول؟",
    language: "ar",
    mustCite: true,
  },
  {
    name: "AR: حقوق أصحاب البيانات",
    query: "ما حقوق أصحاب البيانات وفق نظام حماية البيانات؟",
    language: "ar",
    mustCite: true,
  },
  {
    name: "EN: out-of-scope → abstain",
    query: "What is the weather in Riyadh tomorrow?",
    language: "en",
    mustAbstain: true,
  },
  {
    name: "AR: out-of-scope → abstain",
    query: "ما وصفة الكبسة السعودية؟",
    language: "ar",
    mustAbstain: true,
  },
];

type Failure = { name: string; reason: string };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return (await r.json()) as T;
}

async function streamChat(
  message: string,
  language: "en" | "ar",
): Promise<{ text: string; final: ChatEvent | null }> {
  const resp = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, language }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`chat ${resp.status}`);
  }
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let final: ChatEvent | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = parseSSE(raw);
      if (!ev) continue;
      if (ev.event === "delta" && typeof ev.data.delta === "string") {
        text += ev.data.delta;
      } else if (ev.event === "done" || ev.event === "error") {
        final = ev as ChatEvent;
      }
    }
  }
  return { text, final };
}

function parseSSE(raw: string): { event: string; data: any } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

async function runCase(c: Case): Promise<Failure | null> {
  // 1) Retrieval invariant via /api/search.
  const search = await postJson<SearchResp>("/api/search", {
    query: c.query,
    language: c.language,
  });
  if (c.mustReturnControlInTop3) {
    const inTop3 = search.results
      .slice(0, 3)
      .some((r) => r.control === c.mustReturnControlInTop3);
    if (!inTop3) {
      return {
        name: c.name,
        reason: `top-3 missing control ${c.mustReturnControlInTop3}`,
      };
    }
  }

  // 2) Chat turn.
  const { text, final } = await streamChat(c.query, c.language);
  const finalText = final && final.event === "done" && final.data.reject
    ? final.data.replacement ?? text
    : final && final.event === "done" && typeof final.data.clean === "string"
      ? final.data.clean
      : text;

  if (c.mustAbstain) {
    const expected = c.language === "ar" ? ABSTAIN_AR : ABSTAIN_EN;
    if (!finalText.trim().includes(expected)) {
      return { name: c.name, reason: "did not abstain" };
    }
    return null;
  }

  if (c.mustCite) {
    if (final?.event !== "done" || !final.data.grounding?.ok) {
      return { name: c.name, reason: "no grounded final event" };
    }
    const cites = final.data.grounding.citations ?? [];
    if (cites.length === 0) {
      return { name: c.name, reason: "zero citations" };
    }
  }

  return null;
}

async function main() {
  console.log(`Smoke test: ${BASE}\n`);
  const failures: Failure[] = [];
  for (const c of CASES) {
    process.stdout.write(`• ${c.name} … `);
    try {
      const f = await runCase(c);
      if (f) {
        failures.push(f);
        console.log(`FAIL (${f.reason})`);
      } else {
        console.log("ok");
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : "threw";
      failures.push({ name: c.name, reason });
      console.log(`FAIL (${reason})`);
    }
  }

  console.log(`\n${CASES.length - failures.length}/${CASES.length} passed.`);
  if (failures.length > 0) {
    for (const f of failures) console.log(`  - ${f.name}: ${f.reason}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
