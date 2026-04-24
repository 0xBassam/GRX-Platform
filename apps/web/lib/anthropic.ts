import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const CHAT_MODEL = env.GRX_CHAT_MODEL;
export const POLICY_MODEL = env.GRX_POLICY_MODEL;
