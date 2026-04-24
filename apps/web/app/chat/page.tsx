export default function ChatPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Chat</h1>
      <p className="text-slate-600">
        Bilingual RAG chat is wired in Phase 3. This placeholder lives here so
        the route resolves and navigation works during scaffold review.
      </p>
      <div className="rounded border bg-white p-4 text-sm text-slate-500">
        Coming up: streaming answers from Claude grounded in ECC + PDPL chunks,
        with mandatory citations, action buttons, and RTL support.
      </div>
    </div>
  );
}
