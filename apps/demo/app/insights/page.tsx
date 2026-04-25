import { Suspense } from "react";
import { InsightsClient } from "@/components/InsightsClient";

export default function InsightsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <InsightsClient />
    </Suspense>
  );
}
