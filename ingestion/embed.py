"""Batched OpenAI embeddings with retry."""

from __future__ import annotations

import os
from typing import Iterable

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

MODEL = os.environ.get("GRX_EMBEDDING_MODEL", "text-embedding-3-large")
DIM = 3072
BATCH = 96


def _client() -> OpenAI:
    return OpenAI(api_key=os.environ["OPENAI_API_KEY"])


@retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=16))
def _embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    r = client.embeddings.create(model=MODEL, input=texts)
    return [row.embedding for row in r.data]


def embed(texts: Iterable[str]) -> list[list[float]]:
    client = _client()
    out: list[list[float]] = []
    buf: list[str] = []
    for t in texts:
        buf.append(t)
        if len(buf) >= BATCH:
            out.extend(_embed_batch(client, buf))
            buf = []
    if buf:
        out.extend(_embed_batch(client, buf))
    return out
