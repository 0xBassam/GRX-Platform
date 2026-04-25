// Static "Demo Company" coverage seed plus a hardcoded Suggest Next
// Actions response. Stable across reloads — no external state.

import type { Lang } from "@/lib/i18n";
import { MOCK_CONTROLS, type MockControl } from "./controls";

export type Status = "implemented" | "partial" | "missing" | "not_applicable";

export type CoverageRow = MockControl & {
  status: Status | null;
  note: string | null;
};

const DISTRIBUTION: [Status, number][] = [
  ["implemented", 0.55],
  ["partial", 0.75],
  ["missing", 0.95],
  ["not_applicable", 1.0],
];

function pickStatus(code: string): Status {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const r = (h % 1000) / 1000;
  for (const [status, upper] of DISTRIBUTION) if (r < upper) return status;
  return "implemented";
}

export function demoCoverage(framework: "ECC" | "PDPL"): CoverageRow[] {
  return MOCK_CONTROLS.filter((c) => c.framework === framework).map((c) => ({
    ...c,
    status: c.level >= 3 ? pickStatus(c.code) : null,
    note: null,
  }));
}

export function suggestNextActions(
  rows: { code: string; status: Status }[],
  lang: Lang,
): string {
  const gap = rows.filter(
    (r) => r.status === "missing" || r.status === "partial",
  );
  if (gap.length === 0) {
    return lang === "ar"
      ? "لا توجد فجوات حالياً."
      : "No gaps detected. Maintain the current programme and run quarterly reviews.";
  }

  const intro =
    lang === "ar"
      ? "خطة معالجة مرتبة حسب الأولوية بناءً على الفجوات الحالية:"
      : "Prioritised remediation plan based on the current gaps:";

  const lines = gap.slice(0, 10).map((g, i) => {
    const cite = `[ECC ${g.code} · Guide Ecc.pdf · p.${30 + (i % 60)}]`;
    if (lang === "ar") {
      return `${i + 1}. **${g.code}** — توثيق سياسة وإجراء معتمدين، وتعيين مسؤول، وضبط مؤشرات أداء، ثم مراجعة ربع سنوية. ${cite}`;
    }
    return `${i + 1}. **${g.code}** — Approve a policy + procedure pair, assign an owner, define KPIs, and schedule a quarterly review. ${cite}`;
  });

  return [intro, "", ...lines].join("\n");
}
