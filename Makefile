.PHONY: install install-web install-ingest dev build lint migrate ingest ingest-ecc ingest-pdpl seed-demo smoke clean

SHELL := /bin/bash

install: install-web install-ingest

install-web:
	cd apps/web && pnpm install

install-ingest:
	cd ingestion && python3 -m pip install -r requirements.txt

dev:
	cd apps/web && pnpm dev

build:
	cd apps/web && pnpm build

lint:
	cd apps/web && pnpm lint

migrate:
	@echo "Applying Supabase migrations..."
	@if [ -z "$$SUPABASE_DB_URL" ]; then echo "SUPABASE_DB_URL must be set (postgres connection string)"; exit 1; fi
	psql "$$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
	psql "$$SUPABASE_DB_URL" -f supabase/migrations/0002_seed_frameworks.sql

ingest: ingest-ecc ingest-pdpl

ingest-ecc:
	cd ingestion && python3 run.py ingest --framework ECC --pdf "../Guide Ecc.pdf"

ingest-pdpl:
	cd ingestion && python3 run.py ingest --framework PDPL --pdf "../Saudi regulation.pdf"

seed-demo:
	cd apps/web && pnpm tsx lib/demo/seed.ts

smoke:
	cd apps/web && pnpm tsx scripts/smoke.ts

clean:
	rm -rf apps/web/.next apps/web/node_modules ingestion/out ingestion/__pycache__
