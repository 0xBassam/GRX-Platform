import type { MatchRow } from "@/lib/supabase";

// Citation grammar the assistant is required to emit:
//   [<FW> <code> · <source_file> · p.<page>]
// We accept a bullet char (·) or a plain pipe (|) in case the model drifts.
const CITATION_RE =
  /\[(ECC|PDPL)\s+([^\]]+?)\s*[·|]\s*([^\]]+?)\s*[·|]\s*p\.?\s*(\d{1,4})\]/g;

export type ParsedCitation = {
  framework: string;
  code: string;
  source_file: string;
  page: number;
  raw: string;
};

export function parseCitations(text: string): ParsedCitation[] {
  const out: ParsedCitation[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    out.push({
      framework: m[1],
      code: m[2].trim(),
      source_file: m[3].trim(),
      page: Number.parseInt(m[4], 10),
      raw: m[0],
    });
  }
  return out;
}

// A citation resolves when there exists a retrieved match row whose
// framework_code + control_code + source_file + source_page match it.
// Page match is loose by ±1 because PyMuPDF's page numbering can drift by
// one compared to the printed page number shown in the PDF.
export function isResolved(
  citation: ParsedCitation,
  matches: MatchRow[],
): boolean {
  return matches.some(
    (m) =>
      m.framework_code === citation.framework &&
      (m.control_code ?? "") === citation.code &&
      m.source_file === citation.source_file &&
      typeof m.source_page === "number" &&
      Math.abs((m.source_page ?? 0) - citation.page) <= 1,
  );
}

export type GroundingVerdict =
  | { ok: true; citations: ParsedCitation[] }
  | { ok: false; reason: "no_citations" | "unresolved_citation"; detail?: string };

export function verify(text: string, matches: MatchRow[]): GroundingVerdict {
  const citations = parseCitations(text);
  if (citations.length === 0) {
    return { ok: false, reason: "no_citations" };
  }
  for (const c of citations) {
    if (!isResolved(c, matches)) {
      return {
        ok: false,
        reason: "unresolved_citation",
        detail: `Unresolvable citation: ${c.raw}`,
      };
    }
  }
  return { ok: true, citations };
}
