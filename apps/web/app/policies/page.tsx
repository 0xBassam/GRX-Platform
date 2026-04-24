import { PoliciesClient } from "@/components/PoliciesClient";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function PoliciesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const controls = csv(searchParams.controls);
  const lang = (searchParams.lang === "ar" ? "ar" : "en") as "en" | "ar";
  const kind = (["policy", "procedure", "guideline"].includes(
    String(searchParams.kind ?? ""),
  )
    ? (searchParams.kind as "policy" | "procedure" | "guideline")
    : "policy") as "policy" | "procedure" | "guideline";
  return (
    <PoliciesClient
      initialControls={controls}
      initialLang={lang}
      initialKind={kind}
    />
  );
}

function csv(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const s = Array.isArray(v) ? v.join(",") : v;
  return s
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}
