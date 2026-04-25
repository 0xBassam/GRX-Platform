"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { dirOf, UI, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  demoCoverage,
  suggestNextActions,
  type CoverageRow,
  type Status,
} from "@/lib/mocks/insights";

const STATUSES: Status[] = ["implemented", "partial", "missing", "not_applicable"];

export function InsightsClient() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [framework, setFramework] = useState<"ECC" | "PDPL">("ECC");
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = UI[lang];
  const dir = dirOf(lang);

  useEffect(() => {
    setRows(demoCoverage(framework));
    setSelection(new Set());
    setSuggestion(null);
  }, [framework]);

  const stats = useMemo(() => {
    const total = rows.length;
    const implemented = rows.filter((r) => r.status === "implemented").length;
    const partial = rows.filter((r) => r.status === "partial").length;
    const missing = rows.filter((r) => r.status === "missing").length;
    const na = rows.filter((r) => r.status === "not_applicable").length;
    return { total, implemented, partial, missing, na };
  }, [rows]);

  function setStatus(row: CoverageRow, status: Status) {
    setRows((xs) => xs.map((r) => (r.id === row.id ? { ...r, status } : r)));
  }

  function toggleSelect(code: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSuggest() {
    setSuggesting(true);
    setSuggestion(null);
    setError(null);
    const gap = rows
      .filter((r) => r.status === "missing" || r.status === "partial")
      .map((r) => ({ code: r.code, status: r.status as Status }));
    if (gap.length === 0) {
      setError(
        lang === "ar"
          ? "لا توجد ضوابط مفقودة أو جزئية."
          : "No missing or partial controls.",
      );
      setSuggesting(false);
      return;
    }
    // Tiny delay so the spinner is visible.
    await new Promise((r) => setTimeout(r, 400));
    setSuggestion(suggestNextActions(gap, lang));
    setSuggesting(false);
  }

  function fixMissingControls() {
    const gap = rows.filter(
      (r) =>
        (r.status === "missing" || r.status === "partial") &&
        selection.has(r.code),
    );
    if (gap.length === 0) {
      setError(
        lang === "ar"
          ? "حدد ضابطاً مفقوداً أو جزئياً واحداً على الأقل."
          : "Select at least one missing or partial control.",
      );
      return;
    }
    const codes = gap.map((r) => r.code).join(",");
    const search = new URLSearchParams({ controls: codes, lang, kind: "policy" });
    router.push(`/policies?${search.toString()}`);
  }

  return (
    <div dir={dir} className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.insights}</h1>
        <div className="inline-flex rounded border bg-white overflow-hidden text-xs">
          {(["en", "ar"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-3 py-1",
                l === lang
                  ? "bg-brand-500 text-white"
                  : "hover:bg-brand-500/10",
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="flex gap-2 text-sm">
        {(["ECC", "PDPL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFramework(f)}
            className={cn(
              "rounded border px-3 py-1",
              framework === f
                ? "bg-brand-500 text-white"
                : "bg-white hover:bg-brand-500/10",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <StatCard label={labels.covered} value={stats.implemented} tone="green" />
        <StatCard label={labels.partial} value={stats.partial} tone="amber" />
        <StatCard label={labels.missing} value={stats.missing} tone="red" />
        <StatCard label={labels.notApplicable} value={stats.na} tone="slate" />
        <StatCard label={lang === "ar" ? "المجموع" : "Total"} value={stats.total} tone="slate" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="rounded bg-brand-500 text-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {suggesting ? (lang === "ar" ? "جارٍ التحليل…" : "Analysing…") : labels.suggestNext}
        </button>
        <button
          onClick={fixMissingControls}
          disabled={selection.size === 0}
          className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-brand-500/10 disabled:opacity-50"
        >
          {labels.fixMissing} ({selection.size})
        </button>
      </div>

      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
          {error}
        </div>
      )}
      {suggestion && (
        <div className="rounded border bg-white p-4 prose-grx whitespace-pre-wrap">
          {suggestion}
        </div>
      )}

      <div className="rounded-lg border bg-white divide-y">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            {lang === "ar" ? "لا توجد ضوابط." : "No controls."}
          </div>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selection.has(r.code)}
                disabled={r.level < 3}
                onChange={() => toggleSelect(r.code)}
              />
              <span className="font-mono text-xs text-brand-700 min-w-16">
                {r.code}
              </span>
              <span className="flex-1 truncate">
                {(lang === "ar" ? r.title_ar : r.title_en) ||
                  r.title_en ||
                  r.title_ar ||
                  "—"}
              </span>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r, s)}
                    disabled={r.level < 3}
                    className={cn(
                      "rounded border px-2 py-0.5 text-xs",
                      r.status === s
                        ? "bg-brand-500 text-white"
                        : "bg-white hover:bg-brand-500/10",
                      r.level < 3 && "opacity-30 cursor-not-allowed",
                    )}
                    title={s}
                  >
                    {shortStatus(s, lang)}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "slate";
}) {
  const toneCls = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-3", toneCls)}>
      <div className="text-xs">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function shortStatus(s: Status, lang: Lang): string {
  if (lang === "ar") {
    return s === "implemented"
      ? "مطبق"
      : s === "partial"
        ? "جزئي"
        : s === "missing"
          ? "مفقود"
          : "غير منطبق";
  }
  return s === "implemented"
    ? "Impl."
    : s === "partial"
      ? "Partial"
      : s === "missing"
        ? "Missing"
        : "N/A";
}
