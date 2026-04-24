"use client";

import { useMemo, useRef, useState } from "react";
import { detectLang, dirOf, UI, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CitationBadge } from "@/components/CitationBadge";
import { DEMO_QUERIES } from "@/lib/demo/queries";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  actions?: { generate_policy: string[] };
  rejected?: boolean;
};

export function ChatClient({ demo }: { demo: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [uiLang, setUiLang] = useState<Lang>("en");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const labels = UI[uiLang];

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

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          language: lang,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`chat failed: ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const ev = parseSSE(raw);
          if (!ev) continue;

          if (ev.event === "delta" && typeof ev.data.delta === "string") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                last.content += ev.data.delta;
              }
              return next;
            });
          } else if (ev.event === "done") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                if (ev.data.reject) {
                  last.rejected = true;
                  last.content = ev.data.replacement ?? last.content;
                  last.citations = [];
                  last.actions = { generate_policy: [] };
                } else {
                  if (typeof ev.data.clean === "string") {
                    last.content = ev.data.clean;
                  }
                  last.citations = ev.data.grounding?.citations ?? [];
                  last.actions = ev.data.actions ?? { generate_policy: [] };
                }
              }
              return next;
            });
          } else if (ev.event === "error") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                last.rejected = true;
                last.content = "Error: " + (ev.data.error ?? "unknown");
              }
              return next;
            });
          }
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  const pageDir = dirOf(uiLang);

  return (
    <div dir={pageDir} className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.chat}</h1>
        <LangToggle lang={uiLang} onChange={setUiLang} />
      </header>

      {demo && (
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
      )}

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

function Bubble({
  m,
  labels,
}: {
  m: Message;
  labels: typeof UI.en;
}) {
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
      <div
        className={cn(
          "max-w-[90%] rounded-lg border bg-slate-50 px-4 py-3 prose-grx",
          m.rejected && "border-amber-300 bg-amber-50 text-amber-900",
        )}
      >
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
              <a
                key={code}
                href={`/policies?controls=${encodeURIComponent(code)}&lang=${lang}`}
                className="text-xs rounded border px-2 py-1 bg-white hover:bg-brand-500/10 text-brand-700"
              >
                {labels.generatePolicy}: {code}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantContent({ text }: { text: string }) {
  // Minimal Markdown-ish rendering: paragraph breaks, ## headings, numbered lists.
  // We don't pull a full parser yet — keeps bundle small and the output has a
  // fixed shape from the system prompt.
  const parts = useMemo(() => {
    const lines = text.split(/\n/);
    return lines.map((line) => {
      if (line.startsWith("## ")) {
        return { kind: "h2" as const, text: line.slice(3) };
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        return { kind: "li" as const, text: line };
      }
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

function parseSSE(raw: string): { event: string; data: any } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
