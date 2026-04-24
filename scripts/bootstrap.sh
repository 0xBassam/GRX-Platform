#!/usr/bin/env bash
# GRX bootstrap: one-shot "clone -> .env -> running" path.
# Requires a .env at repo root with ANTHROPIC_API_KEY, OPENAI_API_KEY,
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL.
# Optionally GRX_DEMO_MODE=1 to turn on the demo experience.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill it in." >&2
  exit 1
fi

# Load .env for this shell so all children see the vars.
set -a
# shellcheck disable=SC1091
source .env
set +a

required=(ANTHROPIC_API_KEY OPENAI_API_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL)
missing=()
for k in "${required[@]}"; do
  if [ -z "${!k:-}" ]; then missing+=("$k"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "ERROR: missing required env vars: ${missing[*]}" >&2
  exit 1
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing command '$1'. Install and retry." >&2
    exit 1
  fi
}

need node
need pnpm
need python3
need psql

echo "==> Installing web dependencies"
(cd apps/web && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)

echo "==> Installing ingestion dependencies"
python3 -m pip install --quiet -r ingestion/requirements.txt

echo "==> Applying Supabase migrations"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0002_seed_frameworks.sql

echo "==> Ingesting ECC"
python3 ingestion/run.py ingest --framework ECC --pdf "Guide Ecc.pdf"
echo "==> Verifying ECC"
python3 ingestion/run.py verify --framework ECC

echo "==> Ingesting PDPL"
python3 ingestion/run.py ingest --framework PDPL --pdf "Saudi regulation.pdf"
echo "==> Verifying PDPL"
python3 ingestion/run.py verify --framework PDPL

if [ "${GRX_DEMO_MODE:-0}" = "1" ]; then
  echo "==> Seeding Demo Company coverage"
  (cd apps/web && pnpm tsx lib/demo/seed.ts)
fi

echo
echo "Bootstrap complete."
echo "Start the app with:  GRX_DEMO_MODE=${GRX_DEMO_MODE:-0} make dev"
echo "Then (in another terminal): cd apps/web && pnpm tsx scripts/smoke.ts"
