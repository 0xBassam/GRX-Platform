export type Lang = "en" | "ar";
export type Dir = "ltr" | "rtl";

const AR_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;

export function detectLang(text: string): Lang {
  const arMatches = (text.match(AR_RE) ?? []).length;
  return arMatches >= 4 ? "ar" : "en";
}

export const dirOf = (lang: Lang): Dir => (lang === "ar" ? "rtl" : "ltr");

export const ABSTAIN = {
  en: "I could not find sufficient information in the uploaded knowledge base.",
  ar: "لم أتمكن من العثور على معلومات كافية في قاعدة المعرفة التي تم تحميلها.",
} as const;

export type UILabels = {
  appName: string;
  chat: string;
  policies: string;
  insights: string;
  ask: string;
  send: string;
  generatePolicy: string;
  fixMissing: string;
  suggestNext: string;
  downloadDocx: string;
  downloadPdf: string;
  downloadMd: string;
  covered: string;
  partial: string;
  missing: string;
  notApplicable: string;
  demoMode: string;
};

export const UI: Record<Lang, UILabels> = {
  en: {
    appName: "GRX",
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
    downloadMd: "Download Markdown",
    covered: "Covered",
    partial: "Partial",
    missing: "Missing",
    notApplicable: "Not Applicable",
    demoMode: "Static Demo",
  },
  ar: {
    appName: "GRX",
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
    downloadMd: "تنزيل Markdown",
    covered: "مطبق",
    partial: "جزئي",
    missing: "مفقود",
    notApplicable: "غير منطبق",
    demoMode: "عرض ثابت",
  },
} as const;
