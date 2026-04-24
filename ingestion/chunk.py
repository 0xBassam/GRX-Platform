"""Chunker: turns parsed controls + narrative pages into embeddable chunks.

Two chunk styles:
  - control-scoped: one chunk per control per language containing its
    title + objective + requirement + audit evidence. Kept whole even
    when small so the retriever always returns a clean full block when
    the user asks about that control code.
  - narrative: long preamble or between-control pages are split into
    ~800 token windows with 120-token overlap.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import tiktoken

from .segment import ParsedControl, ParseResult

# Tiktoken doesn't ship an official Claude tokenizer; the OpenAI cl100k_base
# tokenizer is a reasonable proxy for token counts across both GPT and Claude.
# For embeddings we use it directly since our embedder is OpenAI.
_ENC = tiktoken.get_encoding("cl100k_base")


@dataclass
class Chunk:
    framework: str
    control_code: str | None
    language: str
    content: str
    tokens: int
    source_file: str
    source_page: int | None


def _count(text: str) -> int:
    return len(_ENC.encode(text))


def _split_narrative(text: str, target: int = 800, overlap: int = 120) -> list[str]:
    tokens = _ENC.encode(text)
    if len(tokens) <= target:
        return [text]
    chunks: list[str] = []
    i = 0
    step = target - overlap
    while i < len(tokens):
        window = tokens[i : i + target]
        chunks.append(_ENC.decode(window))
        if i + target >= len(tokens):
            break
        i += step
    return chunks


def _control_chunk_text(c: ParsedControl, lang: str) -> str | None:
    if lang == "en":
        parts = [
            f"{c.framework} {c.code}: {c.title_en}" if c.title_en else f"{c.framework} {c.code}",
            f"Objective: {c.objective_en}" if c.objective_en else "",
            f"Requirements: {c.requirement_en}" if c.requirement_en else "",
            f"Audit Evidence: {c.audit_evidence_en}" if c.audit_evidence_en else "",
        ]
    else:
        parts = [
            f"{c.framework} {c.code}: {c.title_ar}" if c.title_ar else f"{c.framework} {c.code}",
            f"الهدف: {c.objective_ar}" if c.objective_ar else "",
            f"المتطلبات: {c.requirement_ar}" if c.requirement_ar else "",
            f"أدلة التدقيق: {c.audit_evidence_ar}" if c.audit_evidence_ar else "",
        ]
    text = "\n".join(p for p in parts if p).strip()
    if not text or text.endswith(f"{c.framework} {c.code}"):
        return None
    return text


def build_chunks(result: ParseResult, source_file: str) -> list[Chunk]:
    chunks: list[Chunk] = []

    for c in result.controls:
        for lang in ("en", "ar"):
            text = _control_chunk_text(c, lang)
            if not text:
                continue
            chunks.append(
                Chunk(
                    framework=c.framework,
                    control_code=c.code,
                    language=lang,
                    content=text,
                    tokens=_count(text),
                    source_file=source_file,
                    source_page=c.source_page,
                )
            )

    for page, lang, text in result.narrative:
        for piece in _split_narrative(text):
            piece = piece.strip()
            if not piece:
                continue
            chunks.append(
                Chunk(
                    framework=result.framework,
                    control_code=None,
                    language=lang,
                    content=piece,
                    tokens=_count(piece),
                    source_file=source_file,
                    source_page=page,
                )
            )

    return chunks
