// Preloaded demo queries, shown as chips on the chat page when
// GRX_DEMO_MODE=1. Paired EN + AR for the bilingual rehearsal.

import type { Lang } from "@/lib/i18n";

export const DEMO_QUERIES: Record<Lang, string[]> = {
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

export function allDemoQueries(): { query: string; language: Lang }[] {
  return [
    ...DEMO_QUERIES.en.map((q) => ({ query: q, language: "en" as Lang })),
    ...DEMO_QUERIES.ar.map((q) => ({ query: q, language: "ar" as Lang })),
  ];
}
