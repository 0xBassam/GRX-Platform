import { z } from "zod";
import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import { retrieve, formatContext } from "@/lib/rag/retrieve";
import { chatSystemPrompt } from "@/lib/rag/prompts";
import { verify as verifyGrounding } from "@/lib/rag/grounding";
import { parseActions, stripActions } from "@/lib/rag/actions";
import { ABSTAIN, detectLang } from "@/lib/i18n";
import { isDemo } from "@/lib/env";
import { demoCacheGet } from "@/lib/demo/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
  language: z.enum(["en", "ar"]).optional(),
  frameworks: z.array(z.string()).optional(),
});

// SSE stream helper. We emit three event types the client knows about:
//   event: delta   — a token chunk of assistant text
//   event: meta    — retrieval metadata (citations available, pinned codes)
//   event: done    — final payload with actions and grounding verdict
//   event: error   — fatal error; client shows abstain
function sse(data: unknown, event?: string): Uint8Array {
  const e = event ? `event: ${event}\n` : "";
  return new TextEncoder().encode(`${e}data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { message, history } = parsed.data;
  const language = parsed.data.language ?? detectLang(message);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (d: unknown, ev?: string) => controller.enqueue(sse(d, ev));

      try {
        // Demo Mode fast path: if a cached response exists for this exact
        // query, stream it out in 20ms chunks so the UI still looks live.
        if (isDemo()) {
          const hit = await demoCacheGet(message, language);
          if (hit) {
            send({ pinnedCodes: hit.pinnedCodes, cached: true }, "meta");
            for (const delta of hit.deltas) {
              send({ delta }, "delta");
            }
            send(
              { actions: hit.actions, grounding: { ok: true, citations: hit.citations } },
              "done",
            );
            controller.close();
            return;
          }
        }

        const ctx = await retrieve({
          query: message,
          language,
          frameworks: parsed.data.frameworks,
        });

        send(
          {
            pinnedCodes: ctx.pinnedCodes,
            invariantSatisfied: ctx.invariantSatisfied,
            retrieved: ctx.matches.map((m) => ({
              framework: m.framework_code,
              control: m.control_code,
              page: m.source_page,
              source_file: m.source_file,
              score: m.score,
            })),
          },
          "meta",
        );

        // No context at all → short-circuit to abstain.
        if (ctx.matches.length === 0) {
          send({ delta: ABSTAIN[language] }, "delta");
          send({ actions: { generate_policy: [] }, grounding: { ok: false, reason: "no_context" } }, "done");
          controller.close();
          return;
        }

        const system = chatSystemPrompt(language);
        const contextBlock = formatContext(ctx);

        const messages = [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          {
            role: "user" as const,
            content:
              `<query lang="${language}">${message}</query>\n\n` +
              `<context>\n${contextBlock}\n</context>\n\n` +
              (language === "ar"
                ? "أجب وفق القواعد أعلاه."
                : "Answer following the rules above."),
          },
        ];

        let full = "";
        const client = anthropic();

        // Streaming call. Using the SDK's .stream() helper to get typed events.
        const streamResp = client.messages.stream({
          model: CHAT_MODEL,
          max_tokens: 2000,
          system: [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        });

        for await (const event of streamResp) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            full += delta;
            send({ delta }, "delta");
          }
        }

        // Post-generation grounding check. Unresolved citations → replace the
        // answer with the abstain string before finalising.
        const verdict = verifyGrounding(full, ctx.matches);
        if (!verdict.ok) {
          send(
            {
              reject: true,
              reason: verdict.reason,
              detail:
                "detail" in verdict && typeof verdict.detail === "string"
                  ? verdict.detail
                  : undefined,
              replacement: ABSTAIN[language],
            },
            "done",
          );
          controller.close();
          return;
        }

        // Successful grounded answer. Parse action trailer.
        const actions = parseActions(full);
        // Send a final "done" so the client can render action buttons and
        // optionally replace the displayed text with the trailer-stripped
        // version.
        send(
          {
            actions,
            grounding: { ok: true, citations: verdict.citations.map((c) => c.raw) },
            clean: stripActions(full),
          },
          "done",
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "chat_failed";
        send({ error: msg }, "error");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
