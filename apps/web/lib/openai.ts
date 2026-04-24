import OpenAI from "openai";
import { env } from "./env";

let _client: OpenAI | null = null;
export function openai(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

export const EMBEDDING_MODEL = env.GRX_EMBEDDING_MODEL;
export const EMBEDDING_DIM = 3072;

// Single-query helper. The ingestion pipeline batches embeddings in Python;
// at runtime we only embed one query at a time.
export async function embedQuery(text: string): Promise<number[]> {
  const r = await openai().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return r.data[0].embedding as number[];
}
