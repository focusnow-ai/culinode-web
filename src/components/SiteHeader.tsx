"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const path = usePathname();
  const links = [
    { href: "/", label: t.nav.discover, show: true },
    { href: "/notebook", label: t.nav.notebook, show: !!user },
    { href: "/favorites", label: t.nav.favorites, show: !!user },
    { href: "/notifications", label: t.nav.notifications, show: !!user },
    { href: "/account", label: t.nav.account, show: !!user },
  ];
  return (
    <header className="border-b border-border bg-card">
      <nav aria-label="Main menu" className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-4 font-[family-name:var(--font-display)] text-2xl font-bold text-accent">
          {t.appName}
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
            {t.states.loading}
          </span>
        ) : user ? (
          <button type="button" className="btn-ghost" onClick={() => signOut()}>
            {t.nav.signOut}
          </button>
        ) : (
          <Link href={`/sign-in?next=${encodeURIComponent(path)}`} className="btn-primary">
            {t.nav.signIn}
          </Link>
        )}
      </nav>
    </header>
  );
}
