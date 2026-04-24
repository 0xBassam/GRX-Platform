import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const framework = url.searchParams.get("framework") ?? "";
  const q = url.searchParams.get("q")?.toLowerCase() ?? "";

  const sb = supabase();
  let query = sb
    .from("controls")
    .select(
      "id,code,level,title_en,title_ar,source_page,framework_id,frameworks!inner(code)",
    )
    .order("code");
  if (framework) {
    query = query.eq("frameworks.code", framework.toUpperCase());
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = (data ?? []).filter((r) => {
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      (r.title_en ?? "").toLowerCase().includes(q) ||
      (r.title_ar ?? "").includes(q)
    );
  });
  return NextResponse.json({ controls: rows });
}
