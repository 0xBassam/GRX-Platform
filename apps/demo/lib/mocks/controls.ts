// Static mock catalog of ECC + PDPL controls with realistic codes and
// titles. Used by the policies picker and the insights coverage grid.
// Numbers, hierarchy, and titles are aligned with the published ECC
// guide so the demo feels accurate without being exhaustive.

export type MockControl = {
  id: string;
  framework: "ECC" | "PDPL";
  code: string;
  level: 1 | 2 | 3 | 4;
  parent_code: string | null;
  title_en: string;
  title_ar: string;
  source_page: number;
};

const ECC: MockControl[] = [
  // Domain 1 — Cybersecurity Governance
  { id: "ecc-1", framework: "ECC", code: "1", level: 1, parent_code: null,
    title_en: "Cybersecurity Governance", title_ar: "حوكمة الأمن السيبراني", source_page: 23 },
  { id: "ecc-1-1", framework: "ECC", code: "1-1", level: 2, parent_code: "1",
    title_en: "Cybersecurity Strategy", title_ar: "استراتيجية الأمن السيبراني", source_page: 24 },
  { id: "ecc-1-2", framework: "ECC", code: "1-2", level: 2, parent_code: "1",
    title_en: "Cybersecurity Management", title_ar: "إدارة الأمن السيبراني", source_page: 27 },
  { id: "ecc-1-3", framework: "ECC", code: "1-3", level: 2, parent_code: "1",
    title_en: "Cybersecurity Policies and Procedures", title_ar: "سياسات وإجراءات الأمن السيبراني", source_page: 30 },
  { id: "ecc-1-4", framework: "ECC", code: "1-4", level: 2, parent_code: "1",
    title_en: "Cybersecurity Roles and Responsibilities", title_ar: "أدوار ومسؤوليات الأمن السيبراني", source_page: 33 },

  // Domain 2 — Cybersecurity Defence
  { id: "ecc-2", framework: "ECC", code: "2", level: 1, parent_code: null,
    title_en: "Cybersecurity Defence", title_ar: "تعزيز الأمن السيبراني", source_page: 51 },
  { id: "ecc-2-1", framework: "ECC", code: "2-1", level: 2, parent_code: "2",
    title_en: "Asset Management", title_ar: "إدارة الأصول", source_page: 52 },
  { id: "ecc-2-2", framework: "ECC", code: "2-2", level: 2, parent_code: "2",
    title_en: "Identity and Access Management", title_ar: "إدارة الهوية والصلاحيات", source_page: 56 },
  { id: "ecc-2-3", framework: "ECC", code: "2-3", level: 2, parent_code: "2",
    title_en: "Information System and Information Processing Facilities Protection",
    title_ar: "حماية أنظمة ومرافق معالجة المعلومات", source_page: 60 },
  { id: "ecc-2-3-2", framework: "ECC", code: "2-3-2", level: 3, parent_code: "2-3",
    title_en: "Email Protection", title_ar: "حماية البريد الإلكتروني", source_page: 64 },
  { id: "ecc-2-4", framework: "ECC", code: "2-4", level: 2, parent_code: "2",
    title_en: "Network Security Management", title_ar: "إدارة أمن الشبكات", source_page: 67 },
  { id: "ecc-2-5", framework: "ECC", code: "2-5", level: 2, parent_code: "2",
    title_en: "Mobile Devices Security", title_ar: "أمن الأجهزة المحمولة", source_page: 71 },
  { id: "ecc-2-6", framework: "ECC", code: "2-6", level: 2, parent_code: "2",
    title_en: "Data and Information Protection", title_ar: "حماية البيانات والمعلومات", source_page: 75 },
  { id: "ecc-2-7", framework: "ECC", code: "2-7", level: 2, parent_code: "2",
    title_en: "Cryptography", title_ar: "التشفير", source_page: 79 },
  { id: "ecc-2-8", framework: "ECC", code: "2-8", level: 2, parent_code: "2",
    title_en: "Backup and Recovery Management", title_ar: "إدارة النسخ الاحتياطي والاسترجاع", source_page: 83 },
  { id: "ecc-2-9", framework: "ECC", code: "2-9", level: 2, parent_code: "2",
    title_en: "Vulnerabilities Management", title_ar: "إدارة الثغرات", source_page: 87 },
  { id: "ecc-2-10", framework: "ECC", code: "2-10", level: 2, parent_code: "2",
    title_en: "Penetration Testing", title_ar: "اختبار الاختراق", source_page: 90 },
  { id: "ecc-2-11", framework: "ECC", code: "2-11", level: 2, parent_code: "2",
    title_en: "Cybersecurity Event Logs and Monitoring Management",
    title_ar: "إدارة سجلات الأحداث ومراقبة الأمن السيبراني", source_page: 93 },
  { id: "ecc-2-12", framework: "ECC", code: "2-12", level: 2, parent_code: "2",
    title_en: "Cybersecurity Incident and Threat Management",
    title_ar: "إدارة حوادث وتهديدات الأمن السيبراني", source_page: 97 },
  { id: "ecc-2-13", framework: "ECC", code: "2-13", level: 2, parent_code: "2",
    title_en: "Physical Security", title_ar: "الأمن المادي", source_page: 101 },
  { id: "ecc-2-14", framework: "ECC", code: "2-14", level: 2, parent_code: "2",
    title_en: "Web Application Security", title_ar: "أمن تطبيقات الويب", source_page: 105 },

  // Domain 3 — Cybersecurity Resilience
  { id: "ecc-3", framework: "ECC", code: "3", level: 1, parent_code: null,
    title_en: "Cybersecurity Resilience", title_ar: "صمود الأمن السيبراني", source_page: 121 },
  { id: "ecc-3-1", framework: "ECC", code: "3-1", level: 2, parent_code: "3",
    title_en: "Cybersecurity Resilience Aspects of Business Continuity Management (BCM)",
    title_ar: "جوانب صمود الأمن السيبراني في إدارة استمرارية الأعمال", source_page: 122 },

  // Domain 4 — Third-Party and Cloud Computing Cybersecurity
  { id: "ecc-4", framework: "ECC", code: "4", level: 1, parent_code: null,
    title_en: "Third-Party and Cloud Computing Cybersecurity",
    title_ar: "الأمن السيبراني المتعلق بالأطراف الخارجية والحوسبة السحابية", source_page: 131 },
  { id: "ecc-4-1", framework: "ECC", code: "4-1", level: 2, parent_code: "4",
    title_en: "Third-Party Cybersecurity", title_ar: "الأمن السيبراني المتعلق بالأطراف الخارجية", source_page: 132 },
  { id: "ecc-4-2", framework: "ECC", code: "4-2", level: 2, parent_code: "4",
    title_en: "Cloud Computing and Hosting Cybersecurity",
    title_ar: "الأمن السيبراني للحوسبة السحابية والاستضافة", source_page: 137 },

  // Domain 5 — Industrial Control Systems Cybersecurity
  { id: "ecc-5", framework: "ECC", code: "5", level: 1, parent_code: null,
    title_en: "Industrial Control Systems Cybersecurity",
    title_ar: "الأمن السيبراني لأنظمة التحكم الصناعي", source_page: 145 },
  { id: "ecc-5-1", framework: "ECC", code: "5-1", level: 2, parent_code: "5",
    title_en: "ICS Protection", title_ar: "حماية أنظمة التحكم الصناعي", source_page: 146 },
];

const PDPL: MockControl[] = [
  { id: "pdpl-1", framework: "PDPL", code: "Art.1", level: 3, parent_code: null,
    title_en: "Definitions", title_ar: "تعريفات", source_page: 1 },
  { id: "pdpl-2", framework: "PDPL", code: "Art.4", level: 3, parent_code: null,
    title_en: "Rights of Data Subjects", title_ar: "حقوق صاحب البيانات", source_page: 2 },
  { id: "pdpl-3", framework: "PDPL", code: "Art.6", level: 3, parent_code: null,
    title_en: "Lawful Basis for Processing", title_ar: "الأساس القانوني للمعالجة", source_page: 3 },
  { id: "pdpl-4", framework: "PDPL", code: "Art.18", level: 3, parent_code: null,
    title_en: "Security of Personal Data", title_ar: "أمن البيانات الشخصية", source_page: 5 },
  { id: "pdpl-5", framework: "PDPL", code: "Art.20", level: 3, parent_code: null,
    title_en: "Personal Data Breach Notification", title_ar: "إشعار خرق البيانات الشخصية", source_page: 6 },
  { id: "pdpl-6", framework: "PDPL", code: "Art.29", level: 3, parent_code: null,
    title_en: "Cross-Border Transfer of Personal Data",
    title_ar: "نقل البيانات الشخصية خارج المملكة", source_page: 7 },
];

export const MOCK_CONTROLS: MockControl[] = [...ECC, ...PDPL];

export function controlsByFramework(fw: "ECC" | "PDPL"): MockControl[] {
  return MOCK_CONTROLS.filter((c) => c.framework === fw);
}

export function controlByCode(code: string): MockControl | undefined {
  return MOCK_CONTROLS.find((c) => c.code === code);
}
