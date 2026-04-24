# Ingestion

Python CLI in `ingestion/` turns the two source PDFs into structured rows
in Supabase.

## Pipeline

```
extract.py  → page-level text + layout with PyMuPDF (falls back to
              pdfplumber for table-heavy pages)
segment.py  → framework-specific structural parser:
                • ECC: domains (1..5) → subdomains → controls (N-N-N)
                • PDPL: articles (Article N / المادة N)
              Emits `Control` objects with EN and AR text where present,
              source_page populated from the extractor.
chunk.py    → splits narrative text into overlapping chunks
              (~800 tokens target, 120-token overlap). Short control-
              definition blocks are kept whole so the RAG retriever
              returns a clean full control when the user cites its code.
embed.py    → batched OpenAI embeddings (text-embedding-3-large, 3072d)
              with retry + backoff.
load.py     → upserts frameworks, controls, chunks into Supabase via the
              service-role REST endpoint.
run.py      → CLI entrypoint: `python run.py ingest --framework ECC --pdf ...`
```

## Guardrails

- **Structural parser coverage:** after ingest, ECC must have ~114 controls
  across 5 domains / ~29 subdomains. `run.py ingest` prints a summary and
  exits non-zero if the counts diverge significantly — that's a parser bug,
  not a data problem.
- **Spot checks:** `run.py verify` fetches a known control (ECC 2-3-2) and
  asserts `requirement_en` is non-empty with a `source_page`. Same for a
  PDPL article.
- **Bilingual parity:** chunks carry an explicit `language` tag so the
  retriever never mixes RTL/LTR text in a single result.
