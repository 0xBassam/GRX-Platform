# Architecture

## Layers

```
┌────────────────────────────────────────────────────────────────┐
│                        Next.js (App Router)                    │
│  UI (chat / policies / insights)   API routes (chat/search/    │
│                                     generate/insights/export)  │
└────────────────────────────────────────────────────────────────┘
                │                                 │
                ▼                                 ▼
        ┌──────────────┐                 ┌──────────────────┐
        │ Anthropic    │                 │    Supabase      │
        │ Claude       │                 │ Postgres + pgv   │
        │ (chat/gen)   │                 │ controls,chunks  │
        └──────────────┘                 │ coverage,docs    │
                │                        └──────────────────┘
                ▼                                 ▲
        ┌──────────────┐                          │
        │ OpenAI       │   offline ingestion      │
        │ embeddings   │ ───────────────────────► │
        └──────────────┘                          │
                                                  │
                                          ┌───────┴────────┐
                                          │ Python CLI      │
                                          │ extract/segment │
                                          │ chunk/embed     │
                                          └─────────────────┘
```

## Why this shape

- **Monolith Next.js** keeps the MVP ops footprint at zero. One deploy, one
  host, one set of secrets. API routes serve as the Node backend.
- **Python only for ingestion.** PyMuPDF + pdfplumber handle Arabic + layout
  better than current JS libraries. Ingestion is offline anyway — no runtime
  coupling.
- **Postgres + pgvector + FTS** gives us real hybrid search in one place. The
  RPC `match_chunks` pins exact control code matches ahead of RRF-fused
  semantic + FTS results, which is exactly what the retrieval quality
  guardrail requires.
- **Claude for generation, OpenAI for embeddings.** Claude's long-form policy
  drafting quality is the highest lever on audit-readiness. OpenAI
  `text-embedding-3-large` is strong for EN+AR cross-lingual retrieval.

## Grounding model (hard guardrail)

```
user query
    │
    ▼
extract codes + detect language
    │
    ▼
hybrid retrieve  ─── pin code matches ── RRF(semantic, fts) ──► top-k
    │                                                             │
    │      (assert: code-bearing queries have target in top-3)    │
    │                                                             ▼
    ▼                                                       context blocks
prompt Claude (strict grounding rules) ◄────────────────────────
    │
    ▼
validate citations against DB ─── if any fails → abstain string
    │                                  (EN/AR exact text)
    ▼
stream to client
```

## Data flow on a chat turn

1. Browser posts `{ messages, language? }` to `/api/chat`.
2. Route detects language (`lib/i18n.ts`) and extracts codes (`lib/utils.ts`).
3. `lib/rag/retrieve.ts` calls Supabase RPC `match_chunks` with embedding +
   raw text + pinned codes.
4. Route builds context blocks and streams the Claude response.
5. `lib/rag/grounding.ts` verifies citations as tokens are streamed; any
   unresolvable citation → replace the response with the abstain string.
6. `lib/rag/actions.ts` parses the tail-JSON action descriptor and exposes
   action buttons (Generate Policy) in the UI.
