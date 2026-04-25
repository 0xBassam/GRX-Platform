import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/chat" className="font-semibold text-brand-700">
          GRX
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/chat" className="hover:text-brand-700">Chat</Link>
          <Link href="/policies" className="hover:text-brand-700">Policies</Link>
          <Link href="/insights" className="hover:text-brand-700">Insights</Link>
          <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 border border-amber-700/20">
            Static Demo
          </span>
        </nav>
      </div>
    </header>
  );
}
