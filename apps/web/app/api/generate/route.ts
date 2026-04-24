import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePolicy } from "@/lib/docgen/generate";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  kind: z.enum(["policy", "procedure", "guideline"]),
  language: z.enum(["en", "ar"]),
  title: z.string().min(3).max(200),
  controlCodes: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const doc = await generatePolicy(parsed.data);

    // Persist so the user can re-download later via /api/export/*.
    const sb = supabase();
    const { data, error } = await sb
      .from("generated_documents")
      .insert({
        kind: doc.kind,
        title: doc.title,
        language: doc.language,
        control_codes: doc.controlCodes,
        markdown: doc.markdown,
      })
      .select("id")
      .single();
    if (error) throw new Error(`persist_failed: ${error.message}`);

    return NextResponse.json({
      id: data.id,
      kind: doc.kind,
      language: doc.language,
      title: doc.title,
      controlCodes: doc.controlCodes,
      markdown: doc.markdown,
      citationsUsed: doc.citationsUsed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
