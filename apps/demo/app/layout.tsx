import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "GRX — Static Demo",
  description: "Public read-only preview of the GRX compliance assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
          Static demo — no live AI, no backend. Mocked answers, mocked
          policy templates, mocked coverage. Full version with Claude +
          Supabase RAG runs from{" "}
          <code className="font-mono">apps/web</code>.
        </footer>
      </body>
    </html>
  );
}
