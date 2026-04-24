// "Suggest Next Actions" endpoint.
//
// Input:  selected missing / partial control codes (+ optional notes, +
//         language).
// Output: prioritised list of up to 10 actions, each referencing a real
//         control code and carrying at least one citation. Same strict
//         grounding rule as /api/chat — any unresolvable citation causes
//         the item to be dropped; an empty list returns the abstain text.

import { NextResponse } from "next/server";
import { z } from "zod";
import { anthropic, CHAT_MODEL } from "@/lib/anthropic";
import { retrieve, formatContext } from "@/lib/rag/retrieve";
import { verify as verifyGrounding } from "@/lib/rag/grounding";
import { ABSTAIN } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "ar"]),
  items: z
    .array(
      z.object({
        code: z.string().min(1),
        status: z.enum(["missing", "partial"]),
        note: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(50),
});

const SYSTEM_EN = `
You are an expert Saudi GRC analyst producing a prioritised remediation plan.
Hard rules:
1. Use ONLY the provided context. Never rely on prior knowledge.
2. Every action must reference a specific control code from the input list
   and carry at least one citation of the form
   [<FW> <code> · <source_file> · p.<page>] copied verbatim from context.
3. Output Markdown. Use a numbered list, up to 10 items. Each item:
   **<code> — <short title>**  \n  <one or two sentence action>  <citation>
4. If context is insufficient, output exactly:
   "I could not find sufficient information in the uploaded knowledge base."
`.trim();

const SYSTEM_AR = `
أنت محلل حوكمة ومخاطر خبير في المملكة العربية السعودية. أنتج خطة معالجة مرتّبة حسب الأولوية.
قواعد إلزامية:
1) استخدم السياق المقدم فقط. لا تعتمد على معرفة سابقة.
2) كل إجراء يجب أن يشير إلى رمز ضابط من قائمة المدخلات، ومعه مرجع بالشكل
   [<الإطار> <الرمز> · <اسم الملف> · p.<الصفحة>] منسوخ حرفياً من السياق.
3) الإخراج Markdown: قائمة مرقّمة حتى 10 بنود. كل بند:
   **<الرمز> — <عنوان قصير>**  \n  <جملة أو جملتان إجرائيتان>  <المرجع>
4) إن لم تكن المعلومات كافية، أخرج فقط:
   "لم أتمكن من العثور على معلومات كافية في قاعدة المعرفة التي تم تحميلها."
`.trim();

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { language, items } = parsed.data;

  try {
    const query =
      (language === "ar" ? "خطة معالجة للضوابط: " : "Remediation plan for controls: ") +
      items.map((it) => it.code).join(", ");
    const ctx = await retrieve({ query, language, k: 16 });
    if (ctx.matches.length === 0) {
      return NextResponse.json({
        markdown: ABSTAIN[language],
        grounded: false,
      });
    }

    const system = language === "ar" ? SYSTEM_AR : SYSTEM_EN;
    const userBlock =
      `<items>\n` +
      items
        .map(
          (it) =>
            `- code=${it.code} status=${it.status}${
              it.note ? ` note=${JSON.stringify(it.note)}` : ""
            }`,
        )
        .join("\n") +
      `\n</items>\n\n<context>\n${formatContext(ctx)}\n</context>`;

    const r = await anthropic().messages.create({
      model: CHAT_MODEL,
      max_tokens: 1500,
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userBlock }],
    });
    const text = r.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const verdict = verifyGrounding(text, ctx.matches);
    if (!verdict.ok) {
      return NextResponse.json({
        markdown: ABSTAIN[language],
        grounded: false,
      });
    }

    return NextResponse.json({
      markdown: text,
      grounded: true,
      citations: verdict.citations.map((c) => c.raw),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "insights_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
