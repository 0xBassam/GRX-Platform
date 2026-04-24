import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extract ECC-style control codes and PDPL article references from a free-text
// query. Returns a deduped list.
// ECC pattern:    '1', '1-1', '1-1-1', '2-3-2'
// PDPL pattern:   'Article 5', 'Art. 5', 'المادة 5'
// This is used by the retriever to pin the exact control in top-3.
const ECC_CODE_RE = /\b(\d{1,2}-\d{1,2}(?:-\d{1,2})?)\b/g;
const PDPL_EN_RE = /\b(?:article|art\.?)\s*(\d{1,3})\b/gi;
const PDPL_AR_RE = /المادة\s*(\d{1,3})/g;

export function extractCodes(text: string): string[] {
  const codes = new Set<string>();
  for (const m of text.matchAll(ECC_CODE_RE)) codes.add(m[1]);
  for (const m of text.matchAll(PDPL_EN_RE)) codes.add(`Art.${m[1]}`);
  for (const m of text.matchAll(PDPL_AR_RE)) codes.add(`Art.${m[1]}`);
  return Array.from(codes);
}
