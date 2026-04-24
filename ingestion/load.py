"""Upsert frameworks, controls, and chunks into Supabase."""

from __future__ import annotations

import os
from typing import Any

from supabase import Client, create_client

from .chunk import Chunk
from .segment import ParsedControl, ParseResult


def client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def get_framework(sb: Client, code: str) -> dict[str, Any]:
    r = sb.table("frameworks").select("*").eq("code", code).single().execute()
    if not r.data:
        raise RuntimeError(f"Framework '{code}' not seeded. Run 0002_seed_frameworks.sql.")
    return r.data


def _control_row(c: ParsedControl, framework_id: str, parent_id: str | None) -> dict[str, Any]:
    return {
        "framework_id": framework_id,
        "code": c.code,
        "parent_id": parent_id,
        "level": c.level,
        "title_en": c.title_en,
        "title_ar": c.title_ar,
        "objective_en": c.objective_en,
        "objective_ar": c.objective_ar,
        "requirement_en": c.requirement_en,
        "requirement_ar": c.requirement_ar,
        "audit_evidence_en": c.audit_evidence_en,
        "audit_evidence_ar": c.audit_evidence_ar,
        "source_page": c.source_page,
    }


def upsert_controls(sb: Client, framework_id: str, controls: list[ParsedControl]) -> dict[str, str]:
    """Upserts controls and returns a mapping code -> id."""
    # Sort by level so parents exist before children.
    ordered = sorted(controls, key=lambda c: (c.level, c.code))
    code_to_id: dict[str, str] = {}

    # Load existing ids for this framework (so re-ingest is idempotent).
    existing = (
        sb.table("controls")
        .select("id,code")
        .eq("framework_id", framework_id)
        .execute()
    )
    for row in existing.data or []:
        code_to_id[row["code"]] = row["id"]

    for c in ordered:
        parent_id = code_to_id.get(c.parent_code) if c.parent_code else None
        row = _control_row(c, framework_id, parent_id)
        if c.code in code_to_id:
            resp = (
                sb.table("controls")
                .update(row)
                .eq("id", code_to_id[c.code])
                .execute()
            )
        else:
            resp = sb.table("controls").insert(row).execute()
            if resp.data:
                code_to_id[c.code] = resp.data[0]["id"]
    return code_to_id


def insert_chunks(
    sb: Client,
    framework_id: str,
    chunks: list[Chunk],
    embeddings: list[list[float]],
    code_to_id: dict[str, str],
) -> int:
    assert len(chunks) == len(embeddings), "chunk/embedding length mismatch"
    rows: list[dict[str, Any]] = []
    for ch, vec in zip(chunks, embeddings):
        rows.append(
            {
                "framework_id": framework_id,
                "control_id": code_to_id.get(ch.control_code) if ch.control_code else None,
                "language": ch.language,
                "content": ch.content,
                "tokens": ch.tokens,
                "source_file": ch.source_file,
                "source_page": ch.source_page,
                "embedding": vec,
            }
        )

    # Delete existing chunks for this framework before inserting — simplest
    # idempotent semantics for the MVP.
    sb.table("chunks").delete().eq("framework_id", framework_id).execute()

    # Insert in batches of 200 to stay under PostgREST payload limits.
    inserted = 0
    for i in range(0, len(rows), 200):
        batch = rows[i : i + 200]
        sb.table("chunks").insert(batch).execute()
        inserted += len(batch)
    return inserted


def load(result: ParseResult, source_file: str, chunks: list[Chunk], embeddings: list[list[float]]) -> dict[str, int]:
    sb = client()
    fw = get_framework(sb, result.framework)
    code_to_id = upsert_controls(sb, fw["id"], result.controls)
    inserted = insert_chunks(sb, fw["id"], chunks, embeddings, code_to_id)
    return {
        "controls": len(code_to_id),
        "chunks": inserted,
    }
