import { z } from "zod";

// Env is validated lazily, the first time anything in the app actually needs
// a key. This lets `next build` succeed in CI without secrets and keeps
// misconfiguration errors clear at runtime.
const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(10),
  OPENAI_API_KEY: z.string().min(10),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SUPABASE_ANON_KEY: z.string().min(10).optional(),
  GRX_DEMO_MODE: z.enum(["0", "1"]).default("0"),
  GRX_CHAT_MODEL: z.string().default("claude-sonnet-4-6"),
  GRX_POLICY_MODEL: z.string().default("claude-opus-4-7"),
  GRX_EMBEDDING_MODEL: z.string().default("text-embedding-3-large"),
});

type Env = z.infer<typeof schema>;

let _env: Env | null = null;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

// Proxy so `env.ANTHROPIC_API_KEY` is the same ergonomics as before, but the
// parse happens on first access.
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: keyof Env) {
    if (!_env) _env = load();
    return _env[prop];
  },
});

export const isDemo = () => (process.env.GRX_DEMO_MODE ?? "0") === "1";
