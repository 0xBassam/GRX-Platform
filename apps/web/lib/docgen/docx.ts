// DOCX builder for generated policies/procedures/guidelines.
//
// We parse the canonical Markdown produced by lib/docgen/generate.ts and
// emit a styled .docx via the `docx` library. RTL/AR and LTR/EN get
// different font stacks and alignment. Tables for the References section.

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { GeneratedDoc } from "./generate";

const EN_FONT = "Calibri";
const AR_FONT = "Noto Naskh Arabic";

export async function buildDocx(doc: GeneratedDoc): Promise<Buffer> {
  const lang = doc.language;
  const rtl = lang === "ar";
  const font = rtl ? AR_FONT : EN_FONT;
  const align = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const children: (Paragraph | Table)[] = [];

  // Cover page (title + kind + language).
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: rtl,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: doc.title,
          bold: true,
          size: 40, // half-points: 20pt
          font,
          rightToLeft: rtl,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: rtl,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: rtl ? labelKindAR(doc.kind) : labelKindEN(doc.kind),
          italics: true,
          size: 24,
          font,
          rightToLeft: rtl,
        }),
      ],
    }),
  );

  // Body: parse Markdown-ish string we emitted.
  for (const block of parseBlocks(doc.markdown)) {
    if (block.type === "h1") {
      // Skip the H1 — it's the same as the cover title.
      continue;
    }
    if (block.type === "h2") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: align,
          bidirectional: rtl,
          spacing: { before: 360, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              size: 28,
              font,
              rightToLeft: rtl,
            }),
          ],
        }),
      );
      continue;
    }
    if (block.type === "table") {
      children.push(renderTable(block.rows, rtl, font));
      continue;
    }
    if (block.type === "ol" || block.type === "ul") {
      for (const item of block.items) {
        children.push(
          new Paragraph({
            alignment: align,
            bidirectional: rtl,
            spacing: { after: 80 },
            bullet: block.type === "ul" ? { level: 0 } : undefined,
            numbering:
              block.type === "ol" ? { reference: "ol", level: 0 } : undefined,
            children: [
              new TextRun({ text: item, size: 22, font, rightToLeft: rtl }),
            ],
          }),
        );
      }
      continue;
    }
    // Paragraph
    children.push(
      new Paragraph({
        alignment: align,
        bidirectional: rtl,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: block.text, size: 22, font, rightToLeft: rtl }),
        ],
      }),
    );
  }

  const document = new Document({
    numbering: {
      config: [
        {
          reference: "ol",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font, size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

// ---------------------------------------------------------------------------
// Markdown → structured blocks. Deliberately minimal — the generator emits
// a known subset: # / ## headings, paragraphs, numbered/bulleted lists,
// and a single reference table.
// ---------------------------------------------------------------------------

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ol" | "ul"; items: string[] }
  | { type: "table"; rows: string[][] };

function parseBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const out: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("| ")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        // Skip Markdown separator row (--- --- ---)
        if (!row.every((c) => /^:?-+:?$/.test(c))) {
          rows.push(row);
        }
        i++;
      }
      if (rows.length) out.push({ type: "table", rows });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      out.push({ type: "ol", items });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      out.push({ type: "ul", items });
      continue;
    }

    // Paragraph: read until blank line.
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ type: "p", text: buf.join(" ").trim() });
  }
  return out;
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("# ") ||
    line.startsWith("## ") ||
    line.startsWith("| ") ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line)
  );
}

function renderTable(rows: string[][], rtl: boolean, font: string): Table {
  const tableRows = rows.map((cells, rowIdx) => {
    return new TableRow({
      tableHeader: rowIdx === 0,
      children: cells.map(
        (c) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                bidirectional: rtl,
                alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: c,
                    bold: rowIdx === 0,
                    size: 20,
                    font,
                    rightToLeft: rtl,
                  }),
                ],
              }),
            ],
          }),
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

function labelKindEN(k: string): string {
  return k === "policy"
    ? "Policy Document"
    : k === "procedure"
      ? "Procedure Document"
      : "Guideline Document";
}

function labelKindAR(k: string): string {
  return k === "policy"
    ? "وثيقة سياسة"
    : k === "procedure"
      ? "وثيقة إجراء"
      : "وثيقة إرشادات";
}
