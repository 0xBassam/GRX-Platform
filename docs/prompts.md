# Prompts

Prompt design is the single biggest lever on quality. Every prompt here is
built to enforce the strict grounding rule.

## Chat system prompt (EN variant)

- Role: "expert Saudi GRC analyst".
- Rules:
  1. Use ONLY the provided context blocks. Do not rely on prior knowledge.
  2. Every factual claim must carry a bracketed citation of the form
     `[<FW> <code> · <source_file> · p.<page>]`.
  3. If the context is insufficient, respond with exactly the abstain string.
  4. Produce the five-section structure in order:
     `## Control Summary`, `## Explanation`, `## Implementation Steps`,
     `## Required Audit Evidence`, `## Citations`.
  5. After the response, emit a fenced JSON block
     `<actions>{"generate_policy":["<code>", ...]}</actions>` listing each
     control code referenced. Used by `lib/rag/actions.ts`.

## Chat system prompt (AR variant)

Same rules but Arabic wording, abstain in AR, and section headings in AR.

## Policy generator — Stage 1 (outline)

Given `kind`, `scope=[control codes]`, `language`, produce an outline with
the seven required sections. Each section header carries a `<controls>` tag
listing the applicable control codes so Stage 2 retrieves the right context.

## Policy generator — Stage 2 (per-section drafting)

For each section from Stage 1, retrieve the relevant chunks and draft that
section. Same citation rules as chat. The References section assembles
every cited code into a table with source file + page.

## Suggest Next Actions

Input: list of `missing`/`partial` controls with any notes. Output: up to
10 prioritized actions, each referencing a specific control code and
carrying at least one citation. Abstain string if retrieval fails.
