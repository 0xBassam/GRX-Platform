// Static policy template: produces an audit-ready document for a given
// set of control codes. The skeleton (Purpose / Scope / Roles & Resp /
// Policy Statements / Enforcement / Review Cycle / References) matches
// the live generator's section order.

import type { Lang } from "@/lib/i18n";
import { controlByCode } from "./controls";

export type DocKind = "policy" | "procedure" | "guideline";

export type GenerateInput = {
  kind: DocKind;
  language: Lang;
  title: string;
  controlCodes: string[];
};

export type GeneratedDoc = {
  kind: DocKind;
  language: Lang;
  title: string;
  controlCodes: string[];
  markdown: string;
  citationsUsed: string[];
};

function refsTable(codes: string[], lang: Lang): { md: string; citations: string[] } {
  const citations: string[] = [];
  const rows: string[] = [];
  for (const code of codes) {
    const c = controlByCode(code);
    if (!c) continue;
    const fw = c.framework;
    const file = fw === "PDPL" ? "Saudi regulation.pdf" : "Guide Ecc.pdf";
    const title = (lang === "ar" ? c.title_ar : c.title_en) || c.title_en;
    citations.push(`[${fw} ${code} · ${file} · p.${c.source_page}]`);
    rows.push(`| ${fw} ${code} | ${title} | ${file} | p.${c.source_page} |`);
  }
  if (rows.length === 0) {
    return { md: "_(no resolved references)_", citations };
  }
  const header =
    lang === "ar"
      ? `| الضابط | العنوان | المصدر | الصفحة |\n| --- | --- | --- | --- |`
      : `| Control | Title | Source | Page |\n| --- | --- | --- | --- |`;
  return { md: `${header}\n${rows.join("\n")}`, citations };
}

const SECTIONS_EN = (
  kind: DocKind,
): { id: string; en: string }[] => [
  { id: "purpose", en: "Purpose" },
  { id: "scope", en: "Scope" },
  { id: "roles", en: "Roles & Responsibilities" },
  { id: "statements", en: "Policy Statements" },
  ...(kind === "procedure"
    ? [{ id: "steps", en: "Procedures" }]
    : kind === "guideline"
      ? [{ id: "recommendations", en: "Recommended Practices" }]
      : []),
  { id: "enforcement", en: "Enforcement" },
  { id: "review", en: "Review Cycle" },
];

const SECTIONS_AR = (
  kind: DocKind,
): { id: string; ar: string }[] => [
  { id: "purpose", ar: "الغرض" },
  { id: "scope", ar: "النطاق" },
  { id: "roles", ar: "الأدوار والمسؤوليات" },
  { id: "statements", ar: "بنود السياسة" },
  ...(kind === "procedure"
    ? [{ id: "steps", ar: "الإجراءات" }]
    : kind === "guideline"
      ? [{ id: "recommendations", ar: "الممارسات الموصى بها" }]
      : []),
  { id: "enforcement", ar: "التنفيذ" },
  { id: "review", ar: "دورة المراجعة" },
];

function bodyFor(
  sectionId: string,
  codes: string[],
  citation: string,
  lang: Lang,
): string {
  const codesList = codes.join(", ");
  if (lang === "ar") {
    switch (sectionId) {
      case "purpose":
        return `يحدد هذا المستند الالتزامات والمتطلبات لتطبيق الضوابط: ${codesList} بما يضمن الامتثال للأنظمة المعمول بها. ${citation}`;
      case "scope":
        return `يسري هذا المستند على جميع الأنظمة المعلوماتية والتطبيقات وشبكات الاتصال والأطراف الداخلية والخارجية المعنية. ${citation}`;
      case "roles":
        return `- الإدارة العليا: اعتماد السياسة وتوفير الموارد. ${citation}\n- مسؤول الأمن السيبراني: التطبيق والمتابعة.\n- المراجعة الداخلية: التحقق من الالتزام.`;
      case "statements":
        return `- يجب توثيق جميع الإجراءات وفقاً للضوابط المرجعية. ${citation}\n- تُمنح الصلاحيات وفق مبدأ الحد الأدنى وتراجع ربع سنوياً.\n- تُحفظ سجلات التدقيق لمدة لا تقل عن سنة.`;
      case "steps":
        return `1. تحديد المسؤوليات لكل ضابط. ${citation}\n2. تنفيذ الإجراءات الإدارية والتقنية المطلوبة.\n3. توثيق الأدلة وتقديمها للمراجعة.`;
      case "recommendations":
        return `- اعتماد التقييم الدوري للمخاطر المرتبطة بالضوابط. ${citation}\n- نشر التوعية لجميع الموظفين.\n- مواءمة العمليات مع المعايير الدولية ذات الصلة.`;
      case "enforcement":
        return `يتعرض كل من يخالف هذا المستند لإجراءات تأديبية وفق الأنظمة المعمول بها، وقد تشمل إنهاء الخدمة أو الإحالة إلى الجهات المختصة. ${citation}`;
      case "review":
        return `يُراجع هذا المستند سنوياً، أو عند حدوث تغيير جوهري في البيئة التنظيمية أو التهديدات. ${citation}`;
    }
  }
  switch (sectionId) {
    case "purpose":
      return `This document defines the obligations and requirements for the implementation of controls: ${codesList}, ensuring compliance with applicable regulations. ${citation}`;
    case "scope":
      return `This document applies to all information systems, applications, networks, and internal or external parties involved with the listed controls. ${citation}`;
    case "roles":
      return `- Executive management: approve this document and allocate resources. ${citation}\n- CISO / Information Security Officer: implement and monitor.\n- Internal Audit: verify compliance.`;
    case "statements":
      return `- All procedures shall be documented in alignment with the referenced controls. ${citation}\n- Access shall be granted on the principle of least privilege and reviewed quarterly.\n- Audit records shall be retained for no less than one year.`;
    case "steps":
      return `1. Assign ownership for each control. ${citation}\n2. Implement the required administrative and technical measures.\n3. Document evidence and submit for review.`;
    case "recommendations":
      return `- Adopt periodic risk assessments aligned to the referenced controls. ${citation}\n- Run security awareness for all staff.\n- Align operations with relevant international standards.`;
    case "enforcement":
      return `Violations may result in disciplinary action under applicable regulations, up to and including termination and referral to authorities. ${citation}`;
    case "review":
      return `This document is reviewed annually or whenever a material change in the regulatory landscape or threat profile occurs. ${citation}`;
  }
  return "";
}

export function mockGenerate(input: GenerateInput): GeneratedDoc {
  const codes = input.controlCodes.length ? input.controlCodes : ["1-1"];
  const refs = refsTable(codes, input.language);
  const firstCite = refs.citations[0] ?? "[ECC 1-1 · Guide Ecc.pdf · p.24]";

  const sections =
    input.language === "ar"
      ? SECTIONS_AR(input.kind).map((s) => ({ id: s.id, heading: s.ar }))
      : SECTIONS_EN(input.kind).map((s) => ({ id: s.id, heading: s.en }));

  const refsHeading = input.language === "ar" ? "المراجع" : "References";
  const sectionMd = sections
    .map(
      (s) =>
        `## ${s.heading}\n\n${bodyFor(s.id, codes, firstCite, input.language)}`,
    )
    .join("\n\n");

  const markdown =
    `# ${input.title}\n\n${sectionMd}\n\n## ${refsHeading}\n\n${refs.md}\n`;

  return {
    kind: input.kind,
    language: input.language,
    title: input.title,
    controlCodes: codes,
    markdown,
    citationsUsed: refs.citations,
  };
}
