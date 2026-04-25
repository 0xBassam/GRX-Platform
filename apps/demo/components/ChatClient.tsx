"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { detectLang, dirOf, UI, type Lang, type UILabels } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CitationBadge } from "@/components/CitationBadge";
import { mockChat, chunkText, type MockAnswer } from "@/lib/mocks/chat";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  actions?: { generate_policy: string[] };
};

const DEMO_QUERIES: Record<Lang, string[]> = {
  en: [
    "What does ECC 1-1 require?",
    "Explain cybersecurity strategy controls",
    "What evidence is required for access control?",
    "Summarize PDPL obligations for data subjects",
  ],
  ar: [
    "ماذا يتطلب الضابط 1-1؟",
    "اشرح ضوابط استراتيجية الأمن السيبراني",
    "ما الأدلة المطلوبة لضوابط التحكم في الوصول؟",
    "لخص التزامات نظام حماية البيانات تجاه أصحاب البيانات",
  ],
};

export function ChatClient() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>("en");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const labels = UI[uiLang];
  const pageDir = dirOf(uiLang);

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || streaming) return;
    const lang = detectLang(text);
    setUiLang(lang);
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const answer: MockAnswer = mockChat(text, lang);
    const tokens = chunkText(answer.text);
    for (const t of tokens) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") last.content += t;
        return next;
      });
      // ~600 tokens visible per second to feel responsive without being instant.
      await sleep(8);
    }
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        last.citations = answer.citations;
        last.actions = answer.actions;
      }
      return next;
    });
    setStreaming(false);
  }

  return (
    <div dir={pageDir} className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.chat}</h1>
        <LangToggle lang={uiLang} onChange={setUiLang} />
      </header>

      <div className="rounded-lg border bg-brand-50 p-3">
        <div className="text-xs font-semibold text-brand-700 mb-2">
          {labels.demoMode}
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_QUERIES[uiLang].map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs rounded-full border bg-white px-3 py-1 hover:bg-brand-500/10"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg border bg-white p-4 space-y-4 min-h-[400px]"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-slate-500">{labels.ask}</div>
        ) : (
          messages.map((m, i) => <Bubble key={i} m={m} labels={labels} />)
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={labels.ask}
          dir="auto"
          className="flex-1 rounded border px-3 py-2 bg-white"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded bg-brand-500 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {labels.send}
        </button>
      </form>
    </div>
  );
}

function Bubble({ m, labels }: { m: Message; labels: UILabels }) {
  const lang = detectLang(m.content);
  const dir = dirOf(lang);
  if (m.role === "user") {
    return (
      <div dir={dir} className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-brand-500 text-white px-3 py-2 text-sm">
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div dir={dir} className={cn("flex", "justify-start")}>
      <div className="max-w-[90%] rounded-lg border bg-slate-50 px-4 py-3 prose-grx">
        <AssistantContent text={m.content} />
        {m.citations && m.citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {m.citations.map((c) => (
              <CitationBadge key={c} raw={c} />
            ))}
          </div>
        )}
        {m.actions && m.actions.generate_policy.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {m.actions.generate_policy.map((code) => (
              <Link
                key={code}
                href={`/policies?controls=${encodeURIComponent(code)}&lang=${lang}`}
                className="text-xs rounded border px-2 py-1 bg-white hover:bg-brand-500/10 text-brand-700"
              >
                {labels.generatePolicy}: {code}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantContent({ text }: { text: string }) {
  const parts = useMemo(() => {
    const lines = text.split(/\n/);
    return lines.map((line) => {
      if (line.startsWith("## ")) return { kind: "h2" as const, text: line.slice(3) };
      if (/^\s*\d+\.\s+/.test(line)) return { kind: "li" as const, text: line };
      return { kind: "p" as const, text: line };
    });
  }, [text]);

  return (
    <div>
      {parts.map((p, i) => {
        if (p.kind === "h2") return <h2 key={i}>{p.text}</h2>;
        if (p.kind === "li") return <div key={i}>{p.text}</div>;
        return p.text ? <p key={i}>{p.text}</p> : <div key={i} className="h-2" />;
      })}
    </div>
  );
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="inline-flex rounded border bg-white overflow-hidden text-xs">
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={cn(
            "px-3 py-1",
            l === lang ? "bg-brand-500 text-white" : "hover:bg-brand-500/10",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
