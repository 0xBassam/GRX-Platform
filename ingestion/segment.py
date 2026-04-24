"""Framework-specific structural parsers.

ECC controls follow a hierarchical code format:
    1         (domain)
    1-1       (subdomain)
    1-1-1     (control)
    1-1-1-1   (sub-control — rare in ECC but supported)

The ECC guide presents each control with:
    - code and title
    - objective
    - requirement(s)
    - audit evidence / how to verify

The Arabic guide interleaves AR next to EN on the same or facing pages. We
collect both when visible and attach the AR counterpart to the same code.

PDPL has a much smaller surface: flat list of articles ("Article N" /
"المادة N"), each with a short paragraph.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

from .extract import Block, Page

# ---------------------------------------------------------------------------
# Data model matching the Postgres `controls` table.
# ---------------------------------------------------------------------------


@dataclass
class ParsedControl:
    framework: str                    # 'ECC' | 'PDPL'
    code: str                         # '1-1', '1-1-1', 'Art.5'
    level: int                        # 1..4
    parent_code: str | None = None
    title_en: str | None = None
    title_ar: str | None = None
    objective_en: str | None = None
    objective_ar: str | None = None
    requirement_en: str | None = None
    requirement_ar: str | None = None
    audit_evidence_en: str | None = None
    audit_evidence_ar: str | None = None
    source_page: int | None = None
    # Free-text context used by the chunker. Kept separate so control
    # metadata stays clean.
    body_en: str = ""
    body_ar: str = ""


@dataclass
class ParseResult:
    framework: str
    controls: list[ParsedControl] = field(default_factory=list)
    # Narrative pages (prefaces, introductions) that don't belong to a
    # specific control but are still useful retrieval context.
    narrative: list[tuple[int, str, str]] = field(default_factory=list)
    # list of (page, language, text)


# ---------------------------------------------------------------------------
# ECC parser
# ---------------------------------------------------------------------------

_ECC_CODE_RE = re.compile(r"^\s*(\d{1,2}(?:-\d{1,2}){0,3})\b")
_AR_RE = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿ]")

_EN_HEADINGS = {
    "objective": "objective",
    "objectives": "objective",
    "control requirement": "requirement",
    "control requirements": "requirement",
    "requirements": "requirement",
    "controls": "requirement",
    "cybersecurity controls": "requirement",
    "how to verify": "audit",
    "how to check": "audit",
    "audit evidence": "audit",
}
_AR_HEADINGS = {
    "الهدف": "objective",
    "الأهداف": "objective",
    "الضوابط": "requirement",
    "متطلبات الضبط": "requirement",
    "متطلبات الضوابط": "requirement",
    "كيفية التحقق": "audit",
    "أدلة التدقيق": "audit",
}


def _is_arabic(line: str) -> bool:
    return bool(_AR_RE.search(line))


def _classify_heading(line: str) -> str | None:
    key = line.strip().rstrip(":：").lower()
    if key in _EN_HEADINGS:
        return _EN_HEADINGS[key]
    key = line.strip().rstrip(":：")
    if key in _AR_HEADINGS:
        return _AR_HEADINGS[key]
    return None


def parse_ecc(pages: list[Page]) -> ParseResult:
    result = ParseResult(framework="ECC")
    current: ParsedControl | None = None
    section: str | None = None           # 'objective' | 'requirement' | 'audit'
    narrative_buf_en: list[str] = []
    narrative_buf_ar: list[str] = []
    last_narrative_page = 0

    def flush_narrative(page: int) -> None:
        nonlocal narrative_buf_en, narrative_buf_ar, last_narrative_page
        if narrative_buf_en:
            result.narrative.append(
                (last_narrative_page or page, "en", "\n".join(narrative_buf_en).strip())
            )
            narrative_buf_en = []
        if narrative_buf_ar:
            result.narrative.append(
                (last_narrative_page or page, "ar", "\n".join(narrative_buf_ar).strip())
            )
            narrative_buf_ar = []

    def append_section(text: str, lang: str) -> None:
        if current is None or section is None:
            return
        field_name = f"{section}_{lang}"
        prev = getattr(current, field_name) or ""
        joined = (prev + "\n" + text).strip() if prev else text.strip()
        setattr(current, field_name, joined)
        # Also feed the body buffers so the chunker has full context per
        # control.
        if lang == "en":
            current.body_en = (current.body_en + "\n" + text).strip()
        else:
            current.body_ar = (current.body_ar + "\n" + text).strip()

    for page in pages:
        for block in page.blocks:
            raw = block.text.strip()
            if not raw:
                continue
            m = _ECC_CODE_RE.match(raw)
            if m and _looks_like_control_header(block):
                # Start a new control.
                flush_narrative(page.number)
                code = m.group(1)
                title = raw[m.end():].strip(" :—-")
                level = code.count("-") + 1
                parent = "-".join(code.split("-")[:-1]) if "-" in code else None
                current = ParsedControl(
                    framework="ECC",
                    code=code,
                    level=level,
                    parent_code=parent,
                    source_page=page.number,
                )
                if title:
                    if _is_arabic(title):
                        current.title_ar = title
                    else:
                        current.title_en = title
                result.controls.append(current)
                section = None
                continue

            heading = _classify_heading(raw)
            if heading is not None:
                section = heading
                continue

            if current is None:
                # Narrative (preface / intro) before first control.
                last_narrative_page = page.number
                if _is_arabic(raw):
                    narrative_buf_ar.append(raw)
                else:
                    narrative_buf_en.append(raw)
                continue

            # Title may span multiple lines if the control had a long name.
            lang = "ar" if _is_arabic(raw) else "en"
            if section is None:
                # Treat as continuation of the title if we haven't seen a
                # section heading yet.
                if lang == "en" and not current.title_en:
                    current.title_en = raw
                elif lang == "ar" and not current.title_ar:
                    current.title_ar = raw
                else:
                    # Unclassified line — fold into requirement by default so
                    # the retriever still sees it.
                    section = "requirement"
                    append_section(raw, lang)
            else:
                append_section(raw, lang)

    flush_narrative(pages[-1].number if pages else 1)
    # Wire parent_id linkage by code. Actual UUID linking happens in load.py.
    return result


def _looks_like_control_header(block: Block) -> bool:
    """A line starts a new control when it's larger/bolder than body text.

    PyMuPDF reports font size per span. Body text in the ECC guide sits
    around 10-11pt; control headers are 12pt+ and typically bold. This
    heuristic handles headers even when PyMuPDF merges the code and title
    into a single block.
    """
    if block.is_bold:
        return True
    return block.font_size >= 11.5


# ---------------------------------------------------------------------------
# PDPL parser
# ---------------------------------------------------------------------------

_PDPL_EN_RE = re.compile(r"^\s*Article\s+(\d{1,3})\b[:.)-]?\s*(.*)$", re.IGNORECASE)
_PDPL_AR_RE = re.compile(r"^\s*المادة\s+(\d{1,3})\s*[:：.)-]?\s*(.*)$")


def parse_pdpl(pages: list[Page]) -> ParseResult:
    result = ParseResult(framework="PDPL")
    current: ParsedControl | None = None

    def push(code: str, page: int, title: str, lang: str) -> ParsedControl:
        c = ParsedControl(
            framework="PDPL",
            code=code,
            level=3,
            parent_code=None,
            source_page=page,
        )
        if title:
            if lang == "ar":
                c.title_ar = title
            else:
                c.title_en = title
        result.controls.append(c)
        return c

    for page in pages:
        for block in page.blocks:
            raw = block.text.strip()
            if not raw:
                continue

            m_en = _PDPL_EN_RE.match(raw)
            m_ar = _PDPL_AR_RE.match(raw)
            if m_en:
                code = f"Art.{m_en.group(1)}"
                current = push(code, page.number, m_en.group(2).strip(), "en")
                continue
            if m_ar:
                code = f"Art.{m_ar.group(1)}"
                # If an EN article with the same number already exists, merge
                # onto it so EN/AR share a single row.
                existing = next((c for c in result.controls if c.code == code), None)
                if existing is not None:
                    current = existing
                    title = m_ar.group(2).strip()
                    if title and not current.title_ar:
                        current.title_ar = title
                else:
                    current = push(code, page.number, m_ar.group(2).strip(), "ar")
                continue

            if current is None:
                # Narrative before the first article.
                lang = "ar" if _is_arabic(raw) else "en"
                result.narrative.append((page.number, lang, raw))
                continue

            lang = "ar" if _is_arabic(raw) else "en"
            if lang == "ar":
                current.body_ar = (current.body_ar + "\n" + raw).strip()
                current.requirement_ar = (
                    (current.requirement_ar or "") + "\n" + raw
                ).strip()
            else:
                current.body_en = (current.body_en + "\n" + raw).strip()
                current.requirement_en = (
                    (current.requirement_en or "") + "\n" + raw
                ).strip()

    return result


def parse(framework: str, pages: list[Page]) -> ParseResult:
    fw = framework.upper()
    if fw == "ECC":
        return parse_ecc(pages)
    if fw == "PDPL":
        return parse_pdpl(pages)
    raise ValueError(f"Unknown framework: {framework}")
