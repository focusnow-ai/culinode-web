"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const path = usePathname();
  const links = [
    { href: "/", label: tr.nav.discover, show: true },
    { href: "/defter", label: tr.nav.notebook, show: !!user },
    { href: "/favoriler", label: tr.nav.favorites, show: !!user },
    { href: "/bildirimler", label: tr.nav.notifications, show: !!user },
    { href: "/hesap", label: tr.nav.account, show: !!user },
  ];
  return (
    <header className="border-b border-border bg-card">
      <nav aria-label="Ana menü" className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-4 font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          {tr.appName}
        </Link>
        <ul className="flex flex-1 flex-wrap items-center gap-1">
          {links
            .filter((l) => l.show)
            .map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-lg px-3 ${active ? "bg-background font-bold" : "hover:bg-background"}`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
        </ul>
        {!ready ? (
          <span className="text-sm text-muted" aria-live="polite">
            {tr.states.loading}
          </span>
        ) : user ? (
          <button type="button" className="btn-ghost" onClick={() => signOut()}>
            {tr.nav.signOut}
          </button>
        ) : (
          <Link href={`/giris?next=${encodeURIComponent(path)}`} className="btn-primary">
            {tr.nav.signIn}
          </Link>
        )}
      </nav>
    </header>
  );
}
