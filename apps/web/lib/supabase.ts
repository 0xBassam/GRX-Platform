import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client — server-side only. This MVP has no auth boundary,
// so every API route uses the service role directly. Never import from a
// client component.
let _service: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!_service) {
    _service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    });
  }
  return _service;
}

// Types that mirror the schema in supabase/migrations/0001_init.sql.
export type Framework = {
  id: string;
  code: "ECC" | "PDPL" | string;
  title_en: string;
  title_ar: string;
  version: string | null;
  source_document: string | null;
};

export type Control = {
  id: string;
  framework_id: string;
  code: string;
  parent_id: string | null;
  level: 1 | 2 | 3 | 4;
  title_en: string | null;
  title_ar: string | null;
  objective_en: string | null;
  objective_ar: string | null;
  requirement_en: string | null;
  requirement_ar: string | null;
  audit_evidence_en: string | null;
  audit_evidence_ar: string | null;
  source_page: number | null;
};

export type Chunk = {
  id: string;
  framework_id: string;
  control_id: string | null;
  language: "en" | "ar";
  content: string;
  tokens: number | null;
  source_file: string;
  source_page: number | null;
};

export type MatchRow = {
  id: string;
  framework_id: string;
  framework_code: string;
  control_id: string | null;
  control_code: string | null;
  language: "en" | "ar";
  content: string;
  source_file: string;
  source_page: number | null;
  score: number;
  reason: string;
};

export type CoverageStatus =
  | "implemented"
  | "partial"
  | "missing"
  | "not_applicable";

export type GeneratedDocumentKind = "policy" | "procedure" | "guideline";
