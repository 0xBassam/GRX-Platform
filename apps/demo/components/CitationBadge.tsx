"use client";

export function CitationBadge({ raw }: { raw: string }) {
  const m = raw.match(
    /\[(ECC|PDPL)\s+([^\]]+?)\s*[·|]\s*([^\]]+?)\s*[·|]\s*p\.?\s*(\d{1,4})\]/,
  );
  const label = m ? `${m[1]} ${m[2]}` : raw;
  const page = m ? m[4] : null;
  const title = m ? `${m[3]} — page ${page}` : raw;
  return (
    <span className="citation" title={title}>
      {label}
      {page && <span className="opacity-60">· p.{page}</span>}
    </span>
  );
}
