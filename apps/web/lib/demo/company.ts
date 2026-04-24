// "Demo Company" coverage seed. Populates coverage_status with a realistic
// mix of statuses across ECC controls so the /insights view is populated
// the moment the reviewer opens it in Demo Mode.
//
// The exact control code set is derived at runtime from the `controls`
// table (seeded by ingestion). We assign statuses by a deterministic
// hash so the fake coverage is stable across runs.

import { supabase, type CoverageStatus } from "@/lib/supabase";

// 55% implemented, 20% partial, 20% missing, 5% N/A — tuned so the
// "Suggest Next Actions" demo has enough gaps to talk about.
const DISTRIBUTION: [CoverageStatus, number][] = [
  ["implemented", 0.55],
  ["partial", 0.75],
  ["missing", 0.95],
  ["not_applicable", 1.0],
];

function pickStatus(code: string): CoverageStatus {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000;
  for (const [status, upper] of DISTRIBUTION) {
    if (r < upper) return status;
  }
  return "implemented";
}

export async function seedDemoCompany(framework = "ECC"): Promise<number> {
  const sb = supabase();
  const { data: fw } = await sb
    .from("frameworks")
    .select("id")
    .eq("code", framework)
    .single();
  if (!fw) return 0;

  const { data: ctrls } = await sb
    .from("controls")
    .select("id,code,level")
    .eq("framework_id", fw.id);
  if (!ctrls || ctrls.length === 0) return 0;

  // Only seed leaf-level controls (level 3 or 4) — domain rows shouldn't
  // have a coverage status.
  const leaves = ctrls.filter((c) => c.level >= 3);

  const rows = leaves.map((c) => ({
    control_id: c.id,
    status: pickStatus(c.code),
    note: null,
    updated_at: new Date().toISOString(),
  }));

  // Chunked upsert.
  for (let i = 0; i < rows.length; i += 200) {
    await sb.from("coverage_status").upsert(rows.slice(i, i + 200));
  }
  return rows.length;
}
