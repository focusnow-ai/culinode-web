"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenText, CookingPot, Compass, Heart, SignOut, UserCircle } from "@phosphor-icons/react/ssr";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const path = usePathname();
  const links = [
    { href: "/", label: t.nav.discover, icon: Compass, show: true },
    { href: "/notebook", label: t.nav.notebook, icon: BookOpenText, show: !!user },
    { href: "/favorites", label: t.nav.favorites, icon: Heart, show: !!user },
    { href: "/notifications", label: t.nav.notifications, icon: Bell, show: !!user },
    { href: "/account", label: t.nav.account, icon: UserCircle, show: !!user },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <nav aria-label="Main menu" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="group mr-2 flex min-h-11 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-contrast transition-transform group-hover:-rotate-6">
            <CookingPot size={22} weight="bold" aria-hidden />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">{t.appName}</span>
        </Link>
        <ul className="order-3 -mx-4 flex w-full items-center gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:flex-1 md:overflow-visible md:px-0 md:pb-0">
          {links
            .filter((l) => l.show)
            .map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              const Icon = l.icon;
              return (
                <li key={l.href} className="shrink-0">
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-medium transition-colors ${
                      active ? "bg-foreground text-background" : "text-muted hover:bg-sunken hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden />
                    {l.label}
                  </Link>
                </li>
              );
            })}
        </ul>
        <div className="ml-auto flex items-center md:ml-0">
          {!ready ? (
            <span className="skeleton h-11 w-24 rounded-full" aria-live="polite">
              <span className="sr-only">{t.states.loading}</span>
            </span>
          ) : user ? (
            <button type="button" className="btn-quiet px-3.5" onClick={() => signOut()}>
              <SignOut size={18} aria-hidden />
              {t.nav.signOut}
            </button>
          ) : (
            <Link href={`/sign-in?next=${encodeURIComponent(path)}`} className="btn-primary">
              {t.nav.signIn}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
