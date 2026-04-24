export type Lang = "en" | "ar";
export type Dir = "ltr" | "rtl";

// Unicode ranges that cover Arabic, Arabic Supplement, and Arabic Presentation
// Forms. Used to detect the predominant language of free-text input.
const AR_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;

export function detectLang(text: string): Lang {
  const arMatches = (text.match(AR_RE) ?? []).length;
  // Threshold is deliberately low: Arabic script characters dominate any AR
  // sentence while EN sentences may still contain Arabic proper nouns or
  // control titles in parentheses. 4 Arabic chars strongly indicates AR.
  return arMatches >= 4 ? "ar" : "en";
}

export const dirOf = (lang: Lang): Dir => (lang === "ar" ? "rtl" : "ltr");

// Exact abstain strings. Treated as constants — they're asserted against in
// the QA smoke tests and must not be reworded.
export const ABSTAIN = {
  en: "I could not find sufficient information in the uploaded knowledge base.",
  ar: "لم أتمكن من العثور على معلومات كافية في قاعدة المعرفة التي تم تحميلها.",
} as const;

export const UI = {
  en: {
    appName: "GRX",
    tagline: "AI-powered compliance assistant for ECC & PDPL",
    chat: "Chat",
    policies: "Policies",
    insights: "Insights",
    ask: "Ask about a control, e.g. 'What does ECC 1-1 require?'",
    send: "Send",
    generatePolicy: "Generate Policy",
    fixMissing: "Fix Missing Controls",
    suggestNext: "Suggest Next Actions",
    downloadDocx: "Download DOCX",
    downloadPdf: "Download PDF",
    covered: "Covered",
    partial: "Partial",
    missing: "Missing",
    notApplicable: "Not Applicable",
    demoMode: "Demo Mode",
  },
  ar: {
    appName: "GRX",
    tagline: "مساعد الامتثال المدعوم بالذكاء الاصطناعي للضوابط الأساسية وحماية البيانات",
    chat: "الدردشة",
    policies: "السياسات",
    insights: "الرؤى",
    ask: "اسأل عن ضابط، مثل: ماذا يتطلب الضابط 1-1؟",
    send: "إرسال",
    generatePolicy: "إنشاء سياسة",
    fixMissing: "معالجة الضوابط المفقودة",
    suggestNext: "اقتراح الإجراءات التالية",
    downloadDocx: "تنزيل DOCX",
    downloadPdf: "تنزيل PDF",
    covered: "مطبق",
    partial: "جزئي",
    missing: "مفقود",
    notApplicable: "غير منطبق",
    demoMode: "وضع العرض",
  },
} as const;
