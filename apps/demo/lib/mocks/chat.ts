// Pre-recorded answers for the static demo. Each query maps to:
//   - the structured response text (Markdown, with ## sections),
//   - the citations list,
//   - action buttons (Generate Policy targets).
//
// Unknown queries fall back to a contextual stub or the abstain string,
// per language.

import type { Lang } from "@/lib/i18n";
import { ABSTAIN } from "@/lib/i18n";
import { extractCodes } from "@/lib/utils";

export type MockAnswer = {
  text: string;
  citations: string[];
  actions: { generate_policy: string[] };
};

const ECC_1_1_EN = `## Control Summary
ECC 1-1 (Cybersecurity Strategy) requires that the organisation define, document, approve, and communicate a cybersecurity strategy aligned with strategic objectives and applicable laws, with explicit links to the wider information and operational technology landscape. [ECC 1-1 · Guide Ecc.pdf · p.24]

## Explanation
The strategy provides direction for cybersecurity investments and decisions across the organisation. It anchors the cybersecurity programme to business objectives so that controls are measured against outcomes, not just activity. [ECC 1-1 · Guide Ecc.pdf · p.24]

## Implementation Steps
1. Establish a cybersecurity strategy committee with executive sponsorship.
2. Conduct a current-state assessment against ECC and document gaps.
3. Draft the strategy document covering vision, objectives, KPIs, roadmap, and governance model.
4. Obtain formal approval from the board or authorising official.
5. Communicate the strategy to all stakeholders and review it at least annually. [ECC 1-1 · Guide Ecc.pdf · p.25]

## Required Audit Evidence
- Approved cybersecurity strategy document with version control and signatures.
- Minutes of the strategy approval meeting.
- Communication plan and rollout records.
- Annual review evidence demonstrating updates and continued relevance. [ECC 1-1 · Guide Ecc.pdf · p.26]

## Citations
- [ECC 1-1 · Guide Ecc.pdf · p.24]
- [ECC 1-1 · Guide Ecc.pdf · p.25]
- [ECC 1-1 · Guide Ecc.pdf · p.26]`;

const ECC_1_1_AR = `## ملخص الضابط
يتطلب الضابط 1-1 (استراتيجية الأمن السيبراني) أن تضع الجهة استراتيجية موثقة ومعتمدة للأمن السيبراني متوافقة مع الأهداف الاستراتيجية والأنظمة المعمول بها، مع ربطها بمجالات تقنية المعلومات والتقنيات التشغيلية. [ECC 1-1 · Guide Ecc.pdf · p.24]

## الشرح
تمنح الاستراتيجية اتجاهاً موحداً للاستثمارات والقرارات في الأمن السيبراني، وتربط البرنامج بأهداف العمل بحيث تقاس الضوابط بالنتائج لا بالنشاط. [ECC 1-1 · Guide Ecc.pdf · p.24]

## خطوات التطبيق
1. تشكيل لجنة لاستراتيجية الأمن السيبراني برعاية تنفيذية.
2. إجراء تقييم للوضع الراهن مقابل الضوابط الأساسية وتوثيق الفجوات.
3. صياغة وثيقة الاستراتيجية وتشمل الرؤية والأهداف ومؤشرات الأداء وخارطة الطريق ونموذج الحوكمة.
4. الحصول على اعتماد رسمي من المجلس أو صاحب الصلاحية.
5. تعميم الاستراتيجية على المعنيين ومراجعتها سنوياً على الأقل. [ECC 1-1 · Guide Ecc.pdf · p.25]

## الأدلة المطلوبة للتدقيق
- وثيقة استراتيجية معتمدة مع ضبط الإصدارات والتوقيعات.
- محضر اجتماع الاعتماد.
- خطة التعميم وسجلات التطبيق.
- دليل المراجعة السنوية وتحديثاتها. [ECC 1-1 · Guide Ecc.pdf · p.26]

## المراجع
- [ECC 1-1 · Guide Ecc.pdf · p.24]
- [ECC 1-1 · Guide Ecc.pdf · p.25]
- [ECC 1-1 · Guide Ecc.pdf · p.26]`;

const ECC_STRATEGY_EN = `## Control Summary
The ECC cybersecurity strategy controls (domain 1-1) require a documented, approved strategy aligned with strategic objectives and applicable laws and regulations. [ECC 1-1 · Guide Ecc.pdf · p.24]

## Explanation
Subdomain 1-1 sits inside domain 1 (Cybersecurity Governance) and works with subdomains 1-2 (Management), 1-3 (Policies & Procedures), and 1-4 (Roles & Responsibilities) to set the foundation of the cybersecurity programme. [ECC 1 · Guide Ecc.pdf · p.23]

## Implementation Steps
1. Define vision, scope, and objectives in the strategy.
2. Map the strategy to ECC subdomains 1-2 through 1-4.
3. Define KPIs that track adoption and risk reduction.
4. Approve at the executive level and communicate widely.
5. Review annually or upon significant change. [ECC 1-1 · Guide Ecc.pdf · p.25]

## Required Audit Evidence
- Strategy document, KPIs, approval record, communication record, review record. [ECC 1-1 · Guide Ecc.pdf · p.26]

## Citations
- [ECC 1 · Guide Ecc.pdf · p.23]
- [ECC 1-1 · Guide Ecc.pdf · p.24]
- [ECC 1-1 · Guide Ecc.pdf · p.25]
- [ECC 1-1 · Guide Ecc.pdf · p.26]`;

const ECC_STRATEGY_AR = `## ملخص الضابط
ضوابط استراتيجية الأمن السيبراني في النطاق 1-1 تتطلب استراتيجية موثقة ومعتمدة متوافقة مع الأهداف والأنظمة. [ECC 1-1 · Guide Ecc.pdf · p.24]

## الشرح
يندرج النطاق 1-1 ضمن المجال 1 (حوكمة الأمن السيبراني) ويعمل جنباً إلى جنب مع النطاقات 1-2 (الإدارة) و1-3 (السياسات والإجراءات) و1-4 (الأدوار والمسؤوليات) لإرساء أساس البرنامج. [ECC 1 · Guide Ecc.pdf · p.23]

## خطوات التطبيق
1. تحديد الرؤية والنطاق والأهداف.
2. ربط الاستراتيجية بالنطاقات من 1-2 إلى 1-4.
3. تعريف مؤشرات أداء لقياس التبني وخفض المخاطر.
4. الاعتماد من الإدارة العليا والتعميم.
5. المراجعة السنوية أو عند التغييرات الجوهرية. [ECC 1-1 · Guide Ecc.pdf · p.25]

## الأدلة المطلوبة للتدقيق
- وثيقة الاستراتيجية، مؤشرات الأداء، الاعتماد، التعميم، المراجعة. [ECC 1-1 · Guide Ecc.pdf · p.26]

## المراجع
- [ECC 1 · Guide Ecc.pdf · p.23]
- [ECC 1-1 · Guide Ecc.pdf · p.24]
- [ECC 1-1 · Guide Ecc.pdf · p.25]
- [ECC 1-1 · Guide Ecc.pdf · p.26]`;

const ACCESS_EVIDENCE_EN = `## Control Summary
Identity and Access Management (ECC 2-2) requires evidence that access is granted on the principle of least privilege, reviewed periodically, and that privileged access is monitored. [ECC 2-2 · Guide Ecc.pdf · p.56]

## Explanation
Audit evidence is the artefact set that proves the control is operating, not just designed. For access control, this means joiner-mover-leaver records, access review reports, and privileged session logs. [ECC 2-2 · Guide Ecc.pdf · p.57]

## Implementation Steps
1. Maintain an authoritative identity register tied to HR.
2. Document role-based access definitions for each system.
3. Run quarterly access reviews and capture sign-off.
4. Enforce MFA on privileged access and record sessions.
5. Reconcile leaver records weekly. [ECC 2-2 · Guide Ecc.pdf · p.58]

## Required Audit Evidence
- Access provisioning tickets matching HR onboarding records.
- Quarterly access review reports with manager sign-off.
- Privileged session recordings or detailed logs.
- Reconciliation reports of leavers vs deactivations. [ECC 2-2 · Guide Ecc.pdf · p.59]

## Citations
- [ECC 2-2 · Guide Ecc.pdf · p.56]
- [ECC 2-2 · Guide Ecc.pdf · p.57]
- [ECC 2-2 · Guide Ecc.pdf · p.58]
- [ECC 2-2 · Guide Ecc.pdf · p.59]`;

const ACCESS_EVIDENCE_AR = `## ملخص الضابط
إدارة الهوية والصلاحيات (2-2) تتطلب أدلة على منح الصلاحيات وفق مبدأ الحد الأدنى، ومراجعتها دورياً، ومراقبة الصلاحيات المتميزة. [ECC 2-2 · Guide Ecc.pdf · p.56]

## الشرح
أدلة التدقيق هي الوثائق التي تثبت أن الضابط يعمل، لا أنه مصمم فقط. وتشمل سجلات الانضمام والنقل والمغادرة، وتقارير مراجعة الصلاحيات، وسجلات جلسات الصلاحيات المتميزة. [ECC 2-2 · Guide Ecc.pdf · p.57]

## خطوات التطبيق
1. سجل هوية مرجعي مرتبط بالموارد البشرية.
2. توثيق الأدوار والصلاحيات لكل نظام.
3. مراجعة الصلاحيات ربع سنوياً مع توثيق الاعتماد.
4. فرض المصادقة متعددة العوامل على الصلاحيات المتميزة وتسجيل الجلسات.
5. مطابقة المغادرين أسبوعياً مع تعطيل الحسابات. [ECC 2-2 · Guide Ecc.pdf · p.58]

## الأدلة المطلوبة للتدقيق
- تذاكر منح الصلاحيات مطابقة لسجلات الموارد البشرية.
- تقارير مراجعة ربع سنوية معتمدة من المدراء.
- تسجيلات أو سجلات جلسات الصلاحيات المتميزة.
- تقارير مطابقة المغادرين والحسابات الموقفة. [ECC 2-2 · Guide Ecc.pdf · p.59]

## المراجع
- [ECC 2-2 · Guide Ecc.pdf · p.56]
- [ECC 2-2 · Guide Ecc.pdf · p.57]
- [ECC 2-2 · Guide Ecc.pdf · p.58]
- [ECC 2-2 · Guide Ecc.pdf · p.59]`;

const PDPL_DATA_SUBJECTS_EN = `## Control Summary
PDPL Article 4 codifies the rights of personal data subjects, including access, correction, deletion, and the right to object. Controllers must establish processes to honour each right within the required time. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## Explanation
Article 4 sits alongside Article 6 (Lawful Basis) and Article 18 (Security of Personal Data). Together they form the core of a controller's obligations under PDPL. [PDPL Art.6 · Saudi regulation.pdf · p.3]

## Implementation Steps
1. Publish a data-subject rights notice with channels to exercise each right.
2. Build a request-handling workflow with a 30-day default SLA.
3. Train front-line staff to recognise and triage requests.
4. Log every request and response for audit. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## Required Audit Evidence
- Public privacy notice listing data-subject rights.
- Request log with timestamps and outcomes.
- Sample request files demonstrating SLA compliance. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## Citations
- [PDPL Art.4 · Saudi regulation.pdf · p.2]
- [PDPL Art.6 · Saudi regulation.pdf · p.3]`;

const PDPL_DATA_SUBJECTS_AR = `## ملخص الضابط
المادة 4 من نظام حماية البيانات الشخصية تنص على حقوق صاحب البيانات وتشمل الوصول والتصحيح والحذف والاعتراض. على وحدة التحكم وضع آليات لاستيفاء كل حق ضمن المدد النظامية. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## الشرح
ترتبط المادة 4 بالمادة 6 (الأساس القانوني) والمادة 18 (أمن البيانات الشخصية)، وتشكل ثلاثها جوهر التزامات وحدة التحكم. [PDPL Art.6 · Saudi regulation.pdf · p.3]

## خطوات التطبيق
1. نشر إشعار حقوق صاحب البيانات مع قنوات لممارسة كل حق.
2. بناء سير عمل لمعالجة الطلبات بمدة افتراضية 30 يوماً.
3. تدريب الموظفين على تمييز الطلبات وتصنيفها.
4. تسجيل كل طلب واستجابته لأغراض التدقيق. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## الأدلة المطلوبة للتدقيق
- إشعار خصوصية يسرد حقوق صاحب البيانات.
- سجل طلبات بالمواعيد والنتائج.
- نماذج طلبات تثبت الالتزام بالمدد. [PDPL Art.4 · Saudi regulation.pdf · p.2]

## المراجع
- [PDPL Art.4 · Saudi regulation.pdf · p.2]
- [PDPL Art.6 · Saudi regulation.pdf · p.3]`;

type Entry = { matchers: RegExp[]; en: MockAnswer; ar: MockAnswer };

const ENTRIES: Entry[] = [
  {
    matchers: [/\becc\s*1-1\b/i, /\b1-1\b/, /الضابط\s*1-1/, /\b١-١\b/],
    en: {
      text: ECC_1_1_EN,
      citations: [
        "[ECC 1-1 · Guide Ecc.pdf · p.24]",
        "[ECC 1-1 · Guide Ecc.pdf · p.25]",
        "[ECC 1-1 · Guide Ecc.pdf · p.26]",
      ],
      actions: { generate_policy: ["1-1"] },
    },
    ar: {
      text: ECC_1_1_AR,
      citations: [
        "[ECC 1-1 · Guide Ecc.pdf · p.24]",
        "[ECC 1-1 · Guide Ecc.pdf · p.25]",
        "[ECC 1-1 · Guide Ecc.pdf · p.26]",
      ],
      actions: { generate_policy: ["1-1"] },
    },
  },
  {
    matchers: [/cyber.*strategy/i, /strategy.*controls?/i, /استراتيجية الأمن/],
    en: {
      text: ECC_STRATEGY_EN,
      citations: [
        "[ECC 1 · Guide Ecc.pdf · p.23]",
        "[ECC 1-1 · Guide Ecc.pdf · p.24]",
        "[ECC 1-1 · Guide Ecc.pdf · p.25]",
        "[ECC 1-1 · Guide Ecc.pdf · p.26]",
      ],
      actions: { generate_policy: ["1-1", "1-2"] },
    },
    ar: {
      text: ECC_STRATEGY_AR,
      citations: [
        "[ECC 1 · Guide Ecc.pdf · p.23]",
        "[ECC 1-1 · Guide Ecc.pdf · p.24]",
        "[ECC 1-1 · Guide Ecc.pdf · p.25]",
        "[ECC 1-1 · Guide Ecc.pdf · p.26]",
      ],
      actions: { generate_policy: ["1-1", "1-2"] },
    },
  },
  {
    matchers: [/access\s*control/i, /evidence/i, /التحكم في الوصول/, /أدلة/],
    en: {
      text: ACCESS_EVIDENCE_EN,
      citations: [
        "[ECC 2-2 · Guide Ecc.pdf · p.56]",
        "[ECC 2-2 · Guide Ecc.pdf · p.57]",
        "[ECC 2-2 · Guide Ecc.pdf · p.58]",
        "[ECC 2-2 · Guide Ecc.pdf · p.59]",
      ],
      actions: { generate_policy: ["2-2"] },
    },
    ar: {
      text: ACCESS_EVIDENCE_AR,
      citations: [
        "[ECC 2-2 · Guide Ecc.pdf · p.56]",
        "[ECC 2-2 · Guide Ecc.pdf · p.57]",
        "[ECC 2-2 · Guide Ecc.pdf · p.58]",
        "[ECC 2-2 · Guide Ecc.pdf · p.59]",
      ],
      actions: { generate_policy: ["2-2"] },
    },
  },
  {
    matchers: [/pdpl/i, /data subject/i, /أصحاب البيانات/, /حماية البيانات/],
    en: {
      text: PDPL_DATA_SUBJECTS_EN,
      citations: [
        "[PDPL Art.4 · Saudi regulation.pdf · p.2]",
        "[PDPL Art.6 · Saudi regulation.pdf · p.3]",
      ],
      actions: { generate_policy: ["Art.4", "Art.6"] },
    },
    ar: {
      text: PDPL_DATA_SUBJECTS_AR,
      citations: [
        "[PDPL Art.4 · Saudi regulation.pdf · p.2]",
        "[PDPL Art.6 · Saudi regulation.pdf · p.3]",
      ],
      actions: { generate_policy: ["Art.4", "Art.6"] },
    },
  },
];

function fallback(query: string, lang: Lang): MockAnswer {
  // If the query contains a known control code, give a templated stub
  // pointing at it; otherwise abstain.
  const codes = extractCodes(query);
  if (codes.length === 0) {
    return { text: ABSTAIN[lang], citations: [], actions: { generate_policy: [] } };
  }
  const code = codes[0];
  const fw = code.startsWith("Art.") ? "PDPL" : "ECC";
  const file = fw === "PDPL" ? "Saudi regulation.pdf" : "Guide Ecc.pdf";
  const cite = `[${fw} ${code} · ${file} · p.10]`;
  const text =
    lang === "ar"
      ? `## ملخص الضابط
هذا عرض ثابت — الإجابات الحقيقية تُولَّد من النموذج اللغوي والاسترجاع المتجهي في النسخة الكاملة. ${cite}

## الشرح
يُغطى الضابط ${code} ضمن إطار ${fw}. يحدد الضابط متطلبات قابلة للتطبيق ينبغي توثيقها واعتمادها ومراجعتها دورياً. ${cite}

## خطوات التطبيق
1. اعتماد سياسة مرتبطة بالضابط.
2. تنفيذ الإجراءات اللازمة وقياسها.
3. تدوين أدلة التدقيق ومراجعتها.

## الأدلة المطلوبة للتدقيق
- وثيقة معتمدة، سجل تنفيذ، تقرير مراجعة دورية.

## المراجع
- ${cite}`
      : `## Control Summary
This is the static demo — real answers come from the LLM + vector retrieval in the full version. ${cite}

## Explanation
Control ${code} sits within the ${fw} framework. It defines actionable requirements that should be documented, approved, and reviewed periodically. ${cite}

## Implementation Steps
1. Adopt an aligned policy.
2. Implement and measure the corresponding procedures.
3. Capture and review audit evidence regularly.

## Required Audit Evidence
- Approved document, implementation record, periodic review report.

## Citations
- ${cite}`;
  return {
    text,
    citations: [cite],
    actions: { generate_policy: [code] },
  };
}

export function mockChat(query: string, language: Lang): MockAnswer {
  const norm = query.trim();
  for (const e of ENTRIES) {
    if (e.matchers.some((re) => re.test(norm))) {
      return language === "ar" ? e.ar : e.en;
    }
  }
  return fallback(norm, language);
}

// Tokenise into ~3-character chunks for a fake streaming feel.
export function chunkText(text: string, size = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}
