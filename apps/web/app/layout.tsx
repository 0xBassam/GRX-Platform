import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "GRX — Compliance Assistant",
  description: "AI-powered GRC for ECC & PDPL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = process.env.GRX_DEMO_MODE === "1";
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav demo={demo} />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
