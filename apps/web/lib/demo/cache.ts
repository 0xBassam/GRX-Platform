// Demo Mode response cache. Phase 6 populates this with pre-warmed answers
// for the preloaded EN/AR queries. Here in Phase 3 we expose the interface
// so /api/chat can branch on cache hits without waiting for Phase 6.

import type { Actions } from "@/lib/rag/actions";

export type CachedAnswer = {
  pinnedCodes: string[];
  deltas: string[];
  actions: Actions;
  citations: string[];
};

// Keyed by `${lang}:${sha256(query)}`. When Phase 6 runs, the cache is
// populated on first boot from lib/demo/queries.ts via a one-shot call.
const MEM: Map<string, CachedAnswer> = new Map();

export async function demoCacheGet(
  query: string,
  language: "en" | "ar",
): Promise<CachedAnswer | null> {
  const key = await cacheKey(query, language);
  return MEM.get(key) ?? null;
}

export async function demoCacheSet(
  query: string,
  language: "en" | "ar",
  value: CachedAnswer,
): Promise<void> {
  const key = await cacheKey(query, language);
  MEM.set(key, value);
}

export async function cacheKey(query: string, language: "en" | "ar"): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${language}:${query.trim().toLowerCase()}`),
  );
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}
