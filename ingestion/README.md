# GRX ingestion

Turns the ECC and PDPL PDFs into structured `controls` rows + embedded
`chunks` rows in Supabase.

## Install

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Set `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in your
environment (or via a `.env` file at the repo root — `python-dotenv`
picks it up).

## Run

```bash
# from the repo root
make ingest           # ingests both PDFs

# or per framework
python ingestion/run.py ingest --framework ECC  --pdf "Guide Ecc.pdf"
python ingestion/run.py ingest --framework PDPL --pdf "Saudi regulation.pdf"

# verify
python ingestion/run.py verify --framework ECC
python ingestion/run.py verify --framework PDPL
```

## Pipeline

```
run.py ingest
 └── extract.py   PyMuPDF text + layout (page N, blocks, lines)
 └── segment.py   framework-specific parser:
                    ECC:  domain → subdomain → control → sub-control
                    PDPL: Article N / المادة N
 └── chunk.py     ~800-token chunks with 120-token overlap, control-
                  scoped chunks kept whole
 └── embed.py     batched OpenAI text-embedding-3-large calls
 └── load.py      upserts controls + chunks into Supabase
```

## Guardrails (enforced by `run.py verify`)

- ECC ≥ 110 controls across 5 domains (published spec: 114 controls,
  5 main domains, 29 subdomains). Wider tolerance for layout drift.
- ECC 2-3-2 has non-empty `requirement_en` and a `source_page`.
- PDPL has at least 20 articles (spec: 43 articles in the published law).
- Every `chunk` has a non-null embedding with dim=3072.

If any assertion fails the CLI prints the offending row(s) and exits non-zero.
