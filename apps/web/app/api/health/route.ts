import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabase();
  const { data, error } = await sb
    .from("frameworks")
    .select("code,title_en,title_ar,version")
    .order("code");

  if (error) {
    return NextResponse.json(
      { ok: false, stage: "frameworks_query", error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    frameworks: data,
    demo: process.env.GRX_DEMO_MODE === "1",
  });
}
