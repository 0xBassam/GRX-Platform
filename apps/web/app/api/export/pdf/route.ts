import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { buildPdf } from "@/lib/docgen/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const querySchema = z.object({
  id: z.string().uuid(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ id: url.searchParams.get("id") });
  if (!parsed.success) {
    return NextResponse.json({ error: "missing_or_invalid_id" }, { status: 400 });
  }

  const sb = supabase();
  const { data, error } = await sb
    .from("generated_documents")
    .select("*")
    .eq("id", parsed.data.id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const buf = await buildPdf({
    kind: data.kind,
    language: data.language,
    title: data.title,
    controlCodes: data.control_codes,
    markdown: data.markdown,
    citationsUsed: [],
  });

  const safeName = data.title.replace(/[^\w؀-ۿ\- ]+/g, "_").slice(0, 80);
  return new NextResponse(buf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
