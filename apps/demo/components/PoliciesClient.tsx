"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { dirOf, UI, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { controlsByFramework } from "@/lib/mocks/controls";
import { mockGenerate, type DocKind, type GeneratedDoc } from "@/lib/mocks/policies";

export function PoliciesClient() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <PoliciesInner />
    </Suspense>
  );
}

function PoliciesInner() {
  const params = useSearchParams();
  const initialControls = useMemo(() => {
    const raw = params?.get("controls") ?? "";
    return raw.split(",").map((c) => c.trim()).filter(Boolean);
  }, [params]);
  const initialLang = (params?.get("lang") === "ar" ? "ar" : "en") as Lang;
  const initialKind = ((["policy", "procedure", "guideline"].includes(
    params?.get("kind") ?? "",
  )
    ? params?.get("kind")
    : "policy") as DocKind);

  const [lang, setLang] = useState<Lang>(initialLang);
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [framework, setFramework] = useState<"ECC" | "PDPL">(
    initialControls[0]?.startsWith("Art.") ? "PDPL" : "ECC",
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialControls),
  );
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = UI[lang];
  const dir = dirOf(lang);
  const controls = controlsByFramework(framework);

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
    // Simulate a short generation delay so the UX feels real.
    await new Promise((r) => setTimeout(r, 600));
    const doc = mockGenerate({
      kind,
      language: lang,
      title: title.trim(),
      controlCodes: Array.from(selected),
    });
    setResult(doc);
    setGenerating(false);
  }

  function downloadMarkdown() {
    if (!result) return;
    const blob = new Blob([result.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const safe = result.title.replace(/[^\w؀-ۿ\- ]+/g, "_").slice(0, 80);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadHtml() {
    if (!result) return;
    const safe = result.title.replace(/[^\w؀-ۿ\- ]+/g, "_").slice(0, 80);
    const html = wrapAsPrintableHtml(result);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
            {(["policy", "procedure", "guideline"] as DocKind[]).map((k) => (
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
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {lang === "ar"
                  ? "هذا قالب ثابت للعرض فقط — النسخة الكاملة تنتج DOCX و PDF عبر Claude."
                  : "Static template (demo only). The full version produces real DOCX and PDF via Claude."}
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={downloadMarkdown}
                  className="rounded border px-3 py-1 bg-white hover:bg-brand-500/10"
                >
                  {labels.downloadMd}
                </button>
                <button
                  onClick={downloadHtml}
                  className="rounded border px-3 py-1 bg-white hover:bg-brand-500/10"
                >
                  {lang === "ar" ? "تنزيل HTML" : "Download HTML"}
                </button>
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

function wrapAsPrintableHtml(doc: GeneratedDoc): string {
  const rtl = doc.language === "ar";
  const md = doc.markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!doctype html><html lang="${doc.language}" dir="${rtl ? "rtl" : "ltr"}"><head>
<meta charset="utf-8"><title>${doc.title}</title>
<style>
  body{font-family:${rtl ? '"Noto Naskh Arabic","Noto Sans Arabic",serif' : "Calibri,Inter,system-ui,sans-serif"};
       max-width:780px;margin:32px auto;padding:0 24px;line-height:1.55;color:#0f172a}
  h1{font-size:22pt;margin-bottom:12pt}
  h2{font-size:14pt;color:#243fa3;margin:18pt 0 8pt}
  pre{white-space:pre-wrap}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #e2e8f0;padding:6pt 8pt;text-align:${rtl ? "right" : "left"}}
  th{background:#f1f5f9}
</style></head><body><pre>${md}</pre></body></html>`;
}
