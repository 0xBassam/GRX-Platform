import { supabase, type MatchRow } from "@/lib/supabase";
import { embedQuery } from "@/lib/openai";
import { extractCodes } from "@/lib/utils";

export type RetrievalContext = {
  query: string;
  language: "en" | "ar";
  pinnedCodes: string[];
  matches: MatchRow[];
  // True when the retrieval invariant was satisfied:
  //   a code-bearing query returned at least one of the pinned codes
  //   in the top-3 results. Used by /api/search to report health.
  invariantSatisfied: boolean;
};

const K_DEFAULT = 8;
const MIN_SCORE = 0.05;

export async function retrieve(opts: {
  query: string;
  language: "en" | "ar";
  frameworks?: string[];
  k?: number;
}): Promise<RetrievalContext> {
  const { query, language } = opts;
  const k = opts.k ?? K_DEFAULT;
  const pinnedCodes = extractCodes(query);
  const frameworks = opts.frameworks ?? [];

  const embedding = await embedQuery(query);

  const sb = supabase();
  const { data, error } = await sb.rpc("match_chunks", {
    query_embedding: embedding as unknown as string,
    query_text: query,
    pinned_codes: pinnedCodes,
    framework_codes: frameworks,
    languages: [language, otherLang(language)], // allow cross-lingual fallback
    k,
  });

  if (error) {
    throw new Error(`match_chunks RPC failed: ${error.message}`);
  }

  const rows = (data ?? []) as MatchRow[];
  // Drop anything below the minimum score — protects the abstain path.
  const filtered = rows.filter((r) => r.score >= MIN_SCORE);

  const invariantSatisfied =
    pinnedCodes.length === 0 ||
    filtered
      .slice(0, 3)
      .some((r) => r.control_code && pinnedCodes.includes(r.control_code));

  return {
    query,
    language,
    pinnedCodes,
    matches: filtered,
    invariantSatisfied,
  };
}

function otherLang(l: "en" | "ar"): "en" | "ar" {
  return l === "en" ? "ar" : "en";
}

// Context block the model sees. Each block is labelled with a full citation
// token so the assistant can copy the citation verbatim into its answer.
export function formatContext(ctx: RetrievalContext): string {
  if (ctx.matches.length === 0) return "<no_context/>";
  const blocks = ctx.matches.map((m, i) => {
    const code = m.control_code ?? "—";
    const page = m.source_page ?? "?";
    const citation = `[${m.framework_code} ${code} · ${m.source_file} · p.${page}]`;
    return `<ctx id="${i + 1}" citation="${citation}" lang="${m.language}">\n${m.content}\n</ctx>`;
  });
  return blocks.join("\n\n");
}

export function citationFor(m: MatchRow): string {
  const code = m.control_code ?? "—";
  const page = m.source_page ?? "?";
  return `[${m.framework_code} ${code} · ${m.source_file} · p.${page}]`;
}
