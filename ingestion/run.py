"""GRX ingestion CLI.

Usage:
    python run.py ingest --framework ECC  --pdf "../Guide Ecc.pdf"
    python run.py ingest --framework PDPL --pdf "../Saudi regulation.pdf"
    python run.py verify --framework ECC
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
import typer

# Allow running as a script: `python run.py ...`
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ingestion.chunk import build_chunks  # noqa: E402
from ingestion.embed import embed  # noqa: E402
from ingestion.extract import extract_pages  # noqa: E402
from ingestion.load import client, get_framework, load  # noqa: E402
from ingestion.segment import parse  # noqa: E402

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

app = typer.Typer(help="GRX ingestion CLI")
console = Console()


@app.command()
def ingest(
    framework: str = typer.Option(..., help="ECC | PDPL"),
    pdf: Path = typer.Option(..., exists=True, readable=True, help="Path to source PDF"),
) -> None:
    console.print(f"[bold]Extracting[/bold] {pdf} …")
    pages = extract_pages(pdf)
    console.print(f"  → {len(pages)} pages")

    console.print(f"[bold]Segmenting[/bold] as {framework} …")
    result = parse(framework, pages)
    console.print(f"  → {len(result.controls)} controls, {len(result.narrative)} narrative blocks")

    console.print("[bold]Chunking[/bold] …")
    chunks = build_chunks(result, source_file=pdf.name)
    console.print(f"  → {len(chunks)} chunks")

    if not chunks:
        console.print("[red]No chunks produced. Aborting.[/red]")
        raise typer.Exit(code=1)

    console.print("[bold]Embedding[/bold] (OpenAI text-embedding-3-large) …")
    embeddings = embed(ch.content for ch in chunks)
    console.print(f"  → {len(embeddings)} vectors")

    console.print("[bold]Loading[/bold] into Supabase …")
    stats = load(result, pdf.name, chunks, embeddings)
    console.print(
        f"  → [green]ok[/green]: {stats['controls']} controls, {stats['chunks']} chunks"
    )


@app.command()
def verify(framework: str = typer.Option(..., help="ECC | PDPL")) -> None:
    """Post-ingest sanity checks. Exits non-zero on guardrail failure."""
    sb = client()
    fw = get_framework(sb, framework.upper())

    ctrl_resp = (
        sb.table("controls").select("code,level,requirement_en,source_page", count="exact")
        .eq("framework_id", fw["id"]).execute()
    )
    total = len(ctrl_resp.data or [])
    by_level: dict[int, int] = {}
    for row in ctrl_resp.data or []:
        by_level[row["level"]] = by_level.get(row["level"], 0) + 1

    chunks_resp = (
        sb.table("chunks").select("id,embedding,language", count="exact")
        .eq("framework_id", fw["id"]).limit(1).execute()
    )
    chunk_total = chunks_resp.count or 0

    table = Table(title=f"Verify: {framework.upper()}")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="white")
    table.add_row("Total controls", str(total))
    for lvl, n in sorted(by_level.items()):
        table.add_row(f"  level {lvl}", str(n))
    table.add_row("Total chunks", str(chunk_total))
    console.print(table)

    failures: list[str] = []

    if framework.upper() == "ECC":
        if total < 110:
            failures.append(f"ECC controls parsed ({total}) < 110. Published spec is ~114.")
        if by_level.get(1, 0) < 5:
            failures.append(
                f"ECC domains (level=1) parsed ({by_level.get(1, 0)}) < 5."
            )
        spot = (
            sb.table("controls").select("code,requirement_en,source_page")
            .eq("framework_id", fw["id"]).eq("code", "2-3-2").execute()
        )
        if not spot.data or not (spot.data[0].get("requirement_en") or "").strip():
            failures.append("ECC 2-3-2 is missing or has no requirement_en.")
    elif framework.upper() == "PDPL":
        if total < 20:
            failures.append(f"PDPL articles parsed ({total}) < 20.")

    if chunk_total == 0:
        failures.append("No chunks in DB for this framework.")

    if failures:
        console.print("[red]FAIL[/red]")
        for f in failures:
            console.print(f"  - {f}")
        raise typer.Exit(code=1)
    console.print("[green]OK[/green]")


if __name__ == "__main__":
    app()
