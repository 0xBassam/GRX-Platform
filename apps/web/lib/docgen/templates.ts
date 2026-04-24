// Policy / Procedure / Guideline templates.
//
// The QA guardrail requires every generated document to include these
// sections in order, with a References table at the end. These constants
// drive both the Stage-1 outline prompt and the DOCX/PDF renderers, so they
// cannot drift apart.

export type DocKind = "policy" | "procedure" | "guideline";
export type Lang = "en" | "ar";

export type SectionSpec = {
  id:
    | "purpose"
    | "scope"
    | "roles"
    | "statements"
    | "steps"
    | "recommendations"
    | "enforcement"
    | "review"
    | "references";
  en: string;
  ar: string;
};

const PURPOSE: SectionSpec = { id: "purpose", en: "Purpose", ar: "الغرض" };
const SCOPE: SectionSpec = { id: "scope", en: "Scope", ar: "النطاق" };
const ROLES: SectionSpec = {
  id: "roles",
  en: "Roles & Responsibilities",
  ar: "الأدوار والمسؤوليات",
};
const STATEMENTS: SectionSpec = {
  id: "statements",
  en: "Policy Statements",
  ar: "بنود السياسة",
};
const STEPS: SectionSpec = { id: "steps", en: "Procedures", ar: "الإجراءات" };
const RECOMMENDATIONS: SectionSpec = {
  id: "recommendations",
  en: "Recommended Practices",
  ar: "الممارسات الموصى بها",
};
const ENFORCEMENT: SectionSpec = {
  id: "enforcement",
  en: "Enforcement",
  ar: "التنفيذ",
};
const REVIEW: SectionSpec = {
  id: "review",
  en: "Review Cycle",
  ar: "دورة المراجعة",
};
const REFERENCES: SectionSpec = {
  id: "references",
  en: "References",
  ar: "المراجع",
};

export function sectionsFor(kind: DocKind): SectionSpec[] {
  const base = [PURPOSE, SCOPE, ROLES, STATEMENTS];
  const extra: SectionSpec[] =
    kind === "procedure"
      ? [STEPS]
      : kind === "guideline"
        ? [RECOMMENDATIONS]
        : [];
  return [...base, ...extra, ENFORCEMENT, REVIEW, REFERENCES];
}

export function kindLabel(kind: DocKind, lang: Lang): string {
  if (lang === "ar") {
    return kind === "policy" ? "سياسة" : kind === "procedure" ? "إجراء" : "إرشادات";
  }
  return kind === "policy"
    ? "Policy"
    : kind === "procedure"
      ? "Procedure"
      : "Guideline";
}

// Stage-1 outline prompt. We constrain the model to hit the exact section
// order. Stage 2 drafts each section with fresh retrieval.
export function outlinePrompt(args: {
  kind: DocKind;
  lang: Lang;
  title: string;
  controlCodes: string[];
  contextBlock: string;
}): string {
  const secs = sectionsFor(args.kind)
    .map((s, i) => `${i + 1}. ${s[args.lang]}`)
    .join("\n");
  if (args.lang === "ar") {
    return `
أنشئ مخططاً موجزاً لوثيقة "${args.title}" من نوع "${kindLabel(args.kind, "ar")}".
الضوابط المغطاة: ${args.controlCodes.join(", ")}.
يجب أن يحتوي المخطط على الأقسام التالية بهذا الترتيب بالضبط:

${secs}

لكل قسم، أعطِ عنواناً فرعياً قصيراً (جملة أو جملتين) يصف محتواه مستنداً
إلى السياق التالي فقط:

<context>
${args.contextBlock}
</context>

أخرج المخطط بصيغة Markdown باستخدام رؤوس ## لكل قسم.
`.trim();
  }
  return `
Draft an outline for the document titled "${args.title}" (${kindLabel(args.kind, "en")}).
Controls covered: ${args.controlCodes.join(", ")}.
The outline MUST contain the following sections in this exact order:

${secs}

For each section, give a one-sentence subheading describing its intended
content — grounded ONLY in the context below.

<context>
${args.contextBlock}
</context>

Emit the outline as Markdown using ## headings.
`.trim();
}

// Stage-2 drafting prompt for a single section.
export function sectionPrompt(args: {
  kind: DocKind;
  lang: Lang;
  title: string;
  section: SectionSpec;
  controlCodes: string[];
  contextBlock: string;
}): string {
  const heading = args.section[args.lang];
  if (args.lang === "ar") {
    return `
أنت تكتب قسم "${heading}" لوثيقة "${args.title}" من نوع "${kindLabel(args.kind, "ar")}".
الضوابط المعنية: ${args.controlCodes.join(", ")}.

القواعد الإلزامية:
- استخدم فقط السياق أدناه. لا تعتمد على معرفة سابقة.
- اتبع كل جملة حقيقية بمرجع بالشكل
  [<الإطار> <الرمز> · <اسم الملف> · p.<الصفحة>] منسوخ حرفياً من السياق.
- إن لم تكن هناك معلومات كافية في السياق، أخرج فقط: "${"لم أتمكن من العثور على معلومات كافية في قاعدة المعرفة التي تم تحميلها."}".

<context>
${args.contextBlock}
</context>

اكتب نص القسم فقط (بدون عنوان ##) بصيغة Markdown.
${args.section.id === "steps" ? "استخدم قائمة مرقمة بخطوات قابلة للتنفيذ." : ""}
${args.section.id === "statements" ? "استخدم قائمة نقطية من البيانات الواضحة." : ""}
`.trim();
  }
  return `
You are writing the "${heading}" section of the document "${args.title}"
(${kindLabel(args.kind, "en")}). Controls in scope: ${args.controlCodes.join(", ")}.

Hard rules:
- Use ONLY the context below. No prior knowledge.
- Every factual claim must carry a bracketed citation of the form
  [<FW> <code> · <source_file> · p.<page>] copied verbatim from the context.
- If the context is insufficient, output exactly:
  "I could not find sufficient information in the uploaded knowledge base."

<context>
${args.contextBlock}
</context>

Write the section body only (no ## heading) as Markdown.
${args.section.id === "steps" ? "Use a numbered list of actionable steps." : ""}
${args.section.id === "statements" ? "Use a bullet list of clear policy statements." : ""}
`.trim();
}

// Stage-3 References table assembly. References are never hallucinated —
// we always build them from the set of resolved citations across sections.
export function referencesHeading(lang: Lang): string {
  return REFERENCES[lang];
}
