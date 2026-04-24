import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase, type CoverageStatus } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/coverage?framework=ECC
//   → returns every control with its current status (null if unset).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const framework = (url.searchParams.get("framework") ?? "ECC").toUpperCase();

  const sb = supabase();
  const { data: fw, error: fwErr } = await sb
    .from("frameworks")
    .select("id")
    .eq("code", framework)
    .single();
  if (fwErr || !fw) {
    return NextResponse.json({ error: "framework_not_found" }, { status: 404 });
  }

  const { data: controls, error } = await sb
    .from("controls")
    .select(
      "id,code,level,parent_id,title_en,title_ar,source_page,coverage_status(status,note)",
    )
    .eq("framework_id", fw.id)
    .order("code");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    framework,
    controls: (controls ?? []).map((c: any) => ({
      id: c.id,
      code: c.code,
      level: c.level,
      parent_id: c.parent_id,
      title_en: c.title_en,
      title_ar: c.title_ar,
      source_page: c.source_page,
      status: c.coverage_status?.[0]?.status ?? null,
      note: c.coverage_status?.[0]?.note ?? null,
    })),
  });
}

// POST /api/coverage  { control_id, status, note? }
const upsertSchema = z.object({
  control_id: z.string().uuid(),
  status: z.enum(["implemented", "partial", "missing", "not_applicable"]),
  note: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const parsed = upsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const sb = supabase();
  const { error } = await sb.from("coverage_status").upsert({
    control_id: parsed.data.control_id,
    status: parsed.data.status as CoverageStatus,
    note: parsed.data.note ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
