"use client";

import { useEffect, useState } from "react";
import { dirOf, UI, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Kind = "policy" | "procedure" | "guideline";

type ControlRow = {
  id: string;
  code: string;
  level: number;
  title_en: string | null;
  title_ar: string | null;
  frameworks: { code: string };
};

export function PoliciesClient({
  initialControls,
  initialLang,
  initialKind,
}: {
  initialControls: string[];
  initialLang: Lang;
  initialKind: Kind;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [framework, setFramework] = useState<"ECC" | "PDPL">("ECC");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialControls),
  );
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<
    | null
    | {
        id: string;
        markdown: string;
        citationsUsed: string[];
      }
  >(null);
  const [error, setError] = useState<string | null>(null);

  const labels = UI[lang];
  const dir = dirOf(lang);

  useEffect(() => {
    const u = new URL("/api/controls", window.location.origin);
    u.searchParams.set("framework", framework);
    fetch(u.toString())
      .then((r) => r.json())
      .then((d) => setControls(d.controls ?? []))
      .catch(() => setControls([]));
  }, [framework]);

  useEffect(() => {
    if (!title) {
      const firstCode = Array.from(selected)[0];
      if (firstCode) {
        setTitle(
          lang === "ar"
            ? `سياسة ${firstCode}`
            : `Policy for ${framework} ${firstCode}`,
        );
      }
    }
  }, [selected, framework, lang, title]);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function generate() {
    setError(null);
    setResult(null);
    if (selected.size === 0 || !title.trim()) {
      setError(
        lang === "ar"
          ? "يرجى اختيار ضابط واحد على الأقل وتحديد عنوان."
          : "Select at least one control and provide a title.",
      );
      return;
    }
    setGenerating(true);
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          language: lang,
          title: title.trim(),
          controlCodes: Array.from(selected),
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? `generate failed: ${resp.status}`);
      }
      const data = await resp.json();
      setResult({
        id: data.id,
        markdown: data.markdown,
        citationsUsed: data.citationsUsed ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setGenerating(false);
    }
  }

  const filtered = controls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.title_en ?? "").toLowerCase().includes(q) ||
      (c.title_ar ?? "").includes(search)
    );
  });

  return (
    <div dir={dir} className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.policies}</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex gap-2 text-sm">
            {(["policy", "procedure", "guideline"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded border px-3 py-1",
                  kind === k
                    ? "bg-brand-500 text-white"
                    : "bg-white hover:bg-brand-500/10",
                )}
              >
                {k}
              </button>
            ))}
          </div>
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
            <div className="ms-auto inline-flex rounded border bg-white overflow-hidden text-xs">
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
          </div>
          <input
            placeholder={lang === "ar" ? "ابحث عن ضابط…" : "Search controls…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
            className="w-full rounded border px-3 py-2 bg-white"
          />
          <div className="max-h-[400px] overflow-auto rounded border bg-white">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">
                {lang === "ar" ? "لا توجد ضوابط." : "No controls."}
              </div>
            ) : (
              <ul className="divide-y text-sm">
                {filtered.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(c.code)}
                      onChange={() => toggle(c.code)}
                    />
                    <span className="font-mono text-xs text-brand-700 min-w-16">
                      {c.code}
                    </span>
                    <span className="truncate">
                      {(lang === "ar" ? c.title_ar : c.title_en) ||
                        c.title_en ||
                        c.title_ar}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <input
            placeholder={lang === "ar" ? "عنوان الوثيقة" : "Document title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            dir="auto"
            className="w-full rounded border px-3 py-2 bg-white"
          />
          <div className="text-xs text-slate-600">
            {lang === "ar"
              ? `اختيارات الضوابط: ${selected.size}`
              : `Selected controls: ${selected.size}`}
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="rounded bg-brand-500 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {generating
              ? lang === "ar"
                ? "جارٍ الإنشاء…"
                : "Generating…"
              : labels.generatePolicy}
          </button>
          {error && (
            <div className="rounded border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded border bg-white p-3 space-y-3">
              <div className="flex gap-2 text-sm">
                <a
                  href={`/api/export/docx?id=${result.id}`}
                  className="rounded border px-3 py-1 bg-white hover:bg-brand-500/10"
                >
                  {labels.downloadDocx}
                </a>
                <a
                  href={`/api/export/pdf?id=${result.id}`}
                  className="rounded border px-3 py-1 bg-white hover:bg-brand-500/10"
                >
                  {labels.downloadPdf}
                </a>
              </div>
              <pre className="max-h-[360px] overflow-auto text-xs whitespace-pre-wrap">
                {result.markdown}
              </pre>
              {result.citationsUsed.length > 0 && (
                <div className="text-xs text-slate-600">
                  {lang === "ar" ? "المراجع:" : "Citations:"}{" "}
                  {result.citationsUsed.join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
