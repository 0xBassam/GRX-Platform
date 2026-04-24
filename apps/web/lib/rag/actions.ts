// Parse the action trailer the assistant emits at the end of a response.
// Format:
//   <actions>{"generate_policy":["1-1","2-3-2"]}</actions>
//
// Missing/malformed trailer → empty action list. We never let parsing
// failures block the response.

export type Actions = {
  generate_policy: string[];
};

const RE = /<actions>(\{[^<]*\})<\/actions>/;

export function parseActions(text: string): Actions {
  const m = text.match(RE);
  if (!m) return { generate_policy: [] };
  try {
    const obj = JSON.parse(m[1]);
    const codes = Array.isArray(obj?.generate_policy)
      ? obj.generate_policy.filter((c: unknown) => typeof c === "string")
      : [];
    return { generate_policy: codes as string[] };
  } catch {
    return { generate_policy: [] };
  }
}

export function stripActions(text: string): string {
  return text.replace(RE, "").trimEnd();
}
