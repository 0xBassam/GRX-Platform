import { NextResponse } from "next/server";
import { z } from "zod";
import { retrieve } from "@/lib/rag/retrieve";
import { detectLang } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1).max(1000),
  language: z.enum(["en", "ar"]).optional(),
  frameworks: z.array(z.string()).optional(),
  k: z.number().int().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { query } = parsed.data;
  const language = parsed.data.language ?? detectLang(query);
  try {
    const ctx = await retrieve({
      query,
      language,
      frameworks: parsed.data.frameworks,
      k: parsed.data.k,
    });
    return NextResponse.json({
      query,
      language,
      pinnedCodes: ctx.pinnedCodes,
      invariantSatisfied: ctx.invariantSatisfied,
      results: ctx.matches.map((m) => ({
        framework: m.framework_code,
        control: m.control_code,
        language: m.language,
        page: m.source_page,
        source_file: m.source_file,
        score: m.score,
        reason: m.reason,
        content: m.content,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "retrieval_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
