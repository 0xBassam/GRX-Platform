"use client";

import { useEffect, useMemo, useState } from "react";
import { dirOf, UI, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Status = "implemented" | "partial" | "missing" | "not_applicable";

type Row = {
  id: string;
  code: string;
  level: number;
  parent_id: string | null;
  title_en: string | null;
  title_ar: string | null;
  source_page: number | null;
  status: Status | null;
  note: string | null;
};

const STATUSES: Status[] = [
  "implemented",
  "partial",
  "missing",
  "not_applicable",
];

export function InsightsClient() {
  const [lang, setLang] = useState<Lang>("en");
  const [framework, setFramework] = useState<"ECC" | "PDPL">("ECC");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = UI[lang];
  const dir = dirOf(lang);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coverage?framework=${framework}`)
      .then((r) => r.json())
      .then((d) => setRows(d.controls ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [framework]);

  const stats = useMemo(() => {
    const total = rows.length;
    const implemented = rows.filter((r) => r.status === "implemented").length;
    const partial = rows.filter((r) => r.status === "partial").length;
    const missing = rows.filter((r) => r.status === "missing").length;
    const na = rows.filter((r) => r.status === "not_applicable").length;
    return { total, implemented, partial, missing, na };
  }, [rows]);

  async function setStatus(row: Row, status: Status) {
    const prev = row.status;
    setRows((xs) =>
      xs.map((r) => (r.id === row.id ? { ...r, status } : r)),
    );
    try {
      const r = await fetch("/api/coverage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ control_id: row.id, status }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setRows((xs) =>
        xs.map((r) => (r.id === row.id ? { ...r, status: prev } : r)),
      );
    }
  }

  function toggleSelect(code: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function suggestNextActions() {
    setSuggesting(true);
    setSuggestion(null);
    setError(null);
    const gap = rows.filter(
      (r) => r.status === "missing" || r.status === "partial",
    );
    if (gap.length === 0) {
      setError(
        lang === "ar"
          ? "لا توجد ضوابط مفقودة أو جزئية."
          : "No missing or partial controls.",
      );
      setSuggesting(false);
      return;
    }
    try {
      const resp = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: lang,
          items: gap.slice(0, 40).map((r) => ({
            code: r.code,
            status: r.status!,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "request_failed");
      setSuggestion(data.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : "suggest_failed");
    } finally {
      setSuggesting(false);
    }
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
    const u = new URL("/policies", window.location.origin);
    u.searchParams.set("controls", codes);
    u.searchParams.set("lang", lang);
    u.searchParams.set("kind", "policy");
    window.location.href = u.toString();
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
          onClick={suggestNextActions}
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
        {loading ? (
          <div className="p-4 text-sm text-slate-500">{lang === "ar" ? "جارٍ التحميل…" : "Loading…"}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            {lang === "ar"
              ? "لم يتم استيعاب الإطار بعد."
              : "Framework not ingested yet."}
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
                    className={cn(
                      "rounded border px-2 py-0.5 text-xs",
                      r.status === s
                        ? "bg-brand-500 text-white"
                        : "bg-white hover:bg-brand-500/10",
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
