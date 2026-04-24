// PDF builder: renders the canonical Markdown to HTML and uses Puppeteer
// to print it to PDF. Runs both locally (full puppeteer or system Chrome)
// and in Vercel's serverless functions (@sparticuz/chromium).

import type { GeneratedDoc } from "./generate";

type Browser = { newPage: () => Promise<any>; close: () => Promise<void> };

async function launchBrowser(): Promise<Browser> {
  const onVercel = Boolean(process.env.VERCEL);
  if (onVercel) {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return (await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })) as unknown as Browser;
  }
  // Local dev: puppeteer-core + whatever Chrome is on the machine.
  // Point PUPPETEER_EXECUTABLE_PATH at your Chrome binary if autodiscovery fails.
  const { default: puppeteer } = await import("puppeteer-core");
  return (await puppeteer.launch({
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })) as unknown as Browser;
}

export async function buildPdf(doc: GeneratedDoc): Promise<Buffer> {
  const html = renderHtml(doc);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Light-weight Markdown → HTML. Same subset as docx.ts parseBlocks.
function mdToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const row = lines[i]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        if (!row.every((c) => /^:?-+:?$/.test(c))) {
          rows.push(row);
        }
        i++;
      }
      if (rows.length) {
        out.push("<table>");
        rows.forEach((r, idx) => {
          const tag = idx === 0 ? "th" : "td";
          out.push(
            `<tr>${r.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join("")}</tr>`,
          );
        });
        out.push("</table>");
      }
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      out.push(
        "<ol>" + items.map((t) => `<li>${escapeHtml(t)}</li>`).join("") + "</ol>",
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      out.push(
        "<ul>" + items.map((t) => `<li>${escapeHtml(t)}</li>`).join("") + "</ul>",
      );
      continue;
    }

    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${escapeHtml(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("# ") ||
    line.startsWith("## ") ||
    line.startsWith("|") ||
    /^\s*\d+\.\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line)
  );
}

function renderHtml(doc: GeneratedDoc): string {
  const rtl = doc.language === "ar";
  const fontStack = rtl
    ? `"Noto Naskh Arabic", "Noto Sans Arabic", serif`
    : `Calibri, Inter, system-ui, sans-serif`;
  const body = mdToHtml(doc.markdown);
  return `<!doctype html>
<html lang="${doc.language}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { margin: 20mm; }
  body {
    font-family: ${fontStack};
    color: #0f172a;
    line-height: 1.55;
    font-size: 11pt;
  }
  h1 { font-size: 20pt; margin: 0 0 16pt; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; color: #243fa3; }
  p  { margin: 0 0 8pt; }
  ol, ul { padding-${rtl ? "right" : "left"}: 20pt; margin: 0 0 8pt; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8pt;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #e2e8f0;
    padding: 6pt 8pt;
    text-align: ${rtl ? "right" : "left"};
  }
  th { background: #f1f5f9; font-weight: 600; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
