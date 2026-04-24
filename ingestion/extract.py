"""PDF extraction with PyMuPDF (primary) and pdfplumber (fallback for tables).

Returns a list of Page(page_number, text, blocks) — text is the ordered
reading-order text of the page, blocks are layout-preserving rectangles
we keep around for the structural parser.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

import fitz  # pymupdf


@dataclass
class Block:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    font_size: float = 0.0
    is_bold: bool = False


@dataclass
class Page:
    number: int          # 1-indexed
    text: str
    blocks: list[Block] = field(default_factory=list)


def extract_pages(pdf_path: str | Path) -> list[Page]:
    """Extract every page from a PDF as text + layout blocks."""
    pdf_path = str(pdf_path)
    out: list[Page] = []
    with fitz.open(pdf_path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text("text")
            blocks: list[Block] = []
            # "dict" returns a rich structure with font sizes etc.
            data = page.get_text("dict")
            for b in data.get("blocks", []):
                if b.get("type") != 0:  # 0 = text block
                    continue
                for line in b.get("lines", []):
                    spans = line.get("spans", [])
                    if not spans:
                        continue
                    line_text = "".join(s.get("text", "") for s in spans).strip()
                    if not line_text:
                        continue
                    sizes = [s.get("size", 0.0) for s in spans]
                    flags = [s.get("flags", 0) for s in spans]
                    # flag 16 = bold in PyMuPDF's font-flag bitmap
                    is_bold = any(f & 16 for f in flags)
                    x0, y0, x1, y1 = line["bbox"]
                    blocks.append(
                        Block(
                            page=i + 1,
                            x0=x0,
                            y0=y0,
                            x1=x1,
                            y1=y1,
                            text=line_text,
                            font_size=max(sizes) if sizes else 0.0,
                            is_bold=is_bold,
                        )
                    )
            out.append(Page(number=i + 1, text=text, blocks=blocks))
    return out


def iter_lines(pages: list[Page]) -> Iterator[Block]:
    """Flatten pages → blocks in reading order."""
    for p in pages:
        for b in p.blocks:
            yield b
