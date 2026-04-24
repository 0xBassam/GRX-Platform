// Two-stage policy generation driver.
//
// Stage 1: Claude Opus drafts the outline for the whole doc from a broad
//          retrieval scoped to the provided controls.
// Stage 2: For each section, re-retrieve a more targeted context and draft
//          the section body. Grounding is checked; unresolvable citations
//          trigger one retry with a stricter prompt before the section is
//          reduced to the abstain fallback.
// Output:  canonical Markdown string with section ## headings + a
//          References table. This is the source of truth for the DOCX/PDF
//          renderers.

import { anthropic, POLICY_MODEL } from "@/lib/anthropic";
import { supabase, type Control } from "@/lib/supabase";
import { formatContext, retrieve } from "@/lib/rag/retrieve";
import {
  parseCitations,
  verify as verifyGrounding,
} from "@/lib/rag/grounding";
import {
  outlinePrompt,
  sectionPrompt,
  sectionsFor,
  referencesHeading,
  type DocKind,
  type Lang,
} from "@/lib/docgen/templates";
import { ABSTAIN } from "@/lib/i18n";

export type GenerateInput = {
  kind: DocKind;
  language: Lang;
  title: string;
  controlCodes: string[]; // e.g. ['2-1-1','2-3-2'] or ['2'] for a whole domain
};

export type GeneratedDoc = {
  kind: DocKind;
  language: Lang;
  title: string;
  controlCodes: string[];
  markdown: string;
  citationsUsed: string[];
};

async function retrieveForCodes(codes: string[], lang: Lang) {
  // One big retrieval seeded by joining the control codes — good enough
  // to fetch the right pinned controls + nearby context. Each section's
  // Stage-2 retrieval can re-narrow as needed.
  const query = codes.join(" ");
  return retrieve({ query, language: lang, k: 16 });
}

async function callClaude(system: string, user: string): Promise<string> {
  const r = await anthropic().messages.create({
    model: POLICY_MODEL,
    max_tokens: 2000,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: user }],
  });
  return r.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

const SYSTEM_DRAFTER_EN = `
You are an expert Saudi GRC policy author. Produce professional, audit-ready
prose. Never invent facts. Never omit a citation when making a factual claim.
`.trim();

const SYSTEM_DRAFTER_AR = `
أنت كاتب سياسات حوكمة ومخاطر وامتثال خبير في المملكة العربية السعودية.
اكتب نصاً احترافياً جاهزاً للتدقيق. لا تخترع حقائق. لا تترك جملة حقيقية دون مرجع.
`.trim();

function drafterSystem(lang: Lang): string {
  return lang === "ar" ? SYSTEM_DRAFTER_AR : SYSTEM_DRAFTER_EN;
}

export async function generatePolicy(
  input: GenerateInput,
): Promise<GeneratedDoc> {
  const { kind, language, title, controlCodes } = input;

  // Resolve codes → control rows (used for the References table).
  const sb = supabase();
  const { data: controlRows } = await sb
    .from("controls")
    .select("*")
    .in("code", controlCodes);
  const controlByCode = new Map<string, Control>(
    ((controlRows ?? []) as Control[]).map((c) => [c.code, c]),
  );

  // ---- Stage 1: outline ----
  const bigCtx = await retrieveForCodes(controlCodes, language);
  const outlineText = await callClaude(
    drafterSystem(language),
    outlinePrompt({
      kind,
      lang: language,
      title,
      controlCodes,
      contextBlock: formatContext(bigCtx),
    }),
  );
  // We don't rigidly parse the outline; sectionsFor() is authoritative.
  void outlineText;

  // ---- Stage 2: per-section drafts ----
  const sections = sectionsFor(kind);
  const bodyParts: string[] = [];
  const allCitations = new Set<string>();

  for (const section of sections) {
    if (section.id === "references") continue; // built deterministically below

    // Targeted retrieval keyed by section semantics + control codes.
    const targetedQuery =
      language === "ar"
        ? `${section.ar} ${controlCodes.join(" ")}`
        : `${section.en} ${controlCodes.join(" ")}`;
    const ctx = await retrieve({
      query: targetedQuery,
      language,
      k: 8,
    });

    const prompt = sectionPrompt({
      kind,
      lang: language,
      title,
      section,
      controlCodes,
      contextBlock: formatContext(ctx),
    });

    let draft = await callClaude(drafterSystem(language), prompt);
    let verdict = verifyGrounding(draft, ctx.matches);

    // One stricter retry on unresolved citations.
    if (!verdict.ok) {
      const stricter =
        prompt +
        (language === "ar"
          ? "\n\nتذكير صارم: انسخ الاقتباسات كما هي من السياق فقط."
          : "\n\nStrict reminder: copy citations verbatim from the context only.");
      draft = await callClaude(drafterSystem(language), stricter);
      verdict = verifyGrounding(draft, ctx.matches);
    }

    if (!verdict.ok) {
      draft = ABSTAIN[language];
    } else {
      for (const c of verdict.citations) allCitations.add(c.raw);
    }

    const heading = `## ${section[language]}`;
    bodyParts.push(`${heading}\n\n${draft.trim()}`);
  }

  // ---- Stage 3: References table (built from resolved citations + control rows) ----
  const refHeading = referencesHeading(language);
  const refRows: string[] = [];
  const parsed = Array.from(allCitations).flatMap((raw) => parseCitations(raw));

  // Deduplicate by (framework, code, source_file, page).
  const refKey = (c: {
    framework: string;
    code: string;
    source_file: string;
    page: number;
  }) => `${c.framework}|${c.code}|${c.source_file}|${c.page}`;
  const seen = new Set<string>();
  for (const c of parsed) {
    const k = refKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    const ctrl = controlByCode.get(c.code);
    const title_ =
      (language === "ar" ? ctrl?.title_ar : ctrl?.title_en) ?? "";
    refRows.push(`| ${c.framework} ${c.code} | ${title_} | ${c.source_file} | p.${c.page} |`);
  }
  // Always include the explicitly requested controls even if they didn't
  // get cited in-line — so the References table never misses scope.
  for (const code of controlCodes) {
    const ctrl = controlByCode.get(code);
    if (!ctrl) continue;
    const src = ctrl.source_page ?? 0;
    // Best-effort framework inference: ECC codes look like N-N..., PDPL like Art.N.
    const fw = code.startsWith("Art.") ? "PDPL" : "ECC";
    const srcFile =
      fw === "PDPL" ? "Saudi regulation.pdf" : "Guide Ecc.pdf";
    const k = `${fw}|${code}|${srcFile}|${src}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const title_ =
      (language === "ar" ? ctrl.title_ar : ctrl.title_en) ?? "";
    refRows.push(`| ${fw} ${code} | ${title_} | ${srcFile} | p.${src} |`);
  }

  const refsTable =
    language === "ar"
      ? `| الضابط | العنوان | المصدر | الصفحة |\n| --- | --- | --- | --- |\n${refRows.join("\n")}`
      : `| Control | Title | Source | Page |\n| --- | --- | --- | --- |\n${refRows.join("\n")}`;

  const refBlock = `## ${refHeading}\n\n${refsTable}`;

  const markdown =
    `# ${title}\n\n` + bodyParts.join("\n\n") + `\n\n${refBlock}\n`;

  return {
    kind,
    language,
    title,
    controlCodes,
    markdown,
    citationsUsed: Array.from(allCitations),
  };
}
