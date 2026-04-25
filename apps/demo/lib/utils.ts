import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

// Resolve a path against the configured basePath so links work both at
// http://localhost:3001/ and at https://0xbassam.github.io/GRX-Platform/.
export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base) return path;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}
