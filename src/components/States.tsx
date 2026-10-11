"use client";

import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { CloudSlash, Tray, WarningCircle } from "@phosphor-icons/react/ssr";
import { ApiError } from "@/lib/api/client";
import { problemMessage, t } from "@/lib/i18n";

/** Skeleton rows in the shape of a list page. `variant="grid"` mirrors recipe cards. */
export function Loading({ variant = "list" }: { variant?: "list" | "grid" | "form" }) {
  return (
    <div aria-live="polite" aria-busy="true">
      <span className="sr-only">{t.states.loading}</span>
      {variant === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="skeleton aspect-[4/3] rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : variant === "form" ? (
        <div className="flex max-w-3xl flex-col gap-5" aria-hidden>
          <div className="skeleton h-10 w-1/3" />
          <div className="skeleton h-12" />
          <div className="skeleton h-28" />
          <div className="skeleton h-48" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
              <div className="skeleton size-12 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="skeleton h-4 w-2/5" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const code = error instanceof ApiError ? error.code : undefined;
  const Glyph = code === "network" ? CloudSlash : WarningCircle;
  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded-2xl border border-danger/30 bg-danger-soft p-5 sm:flex-row sm:items-center">
      <Glyph size={28} className="shrink-0 text-danger" aria-hidden />
      <p className="flex-1 font-medium">{problemMessage(code, error.message)}</p>
      {code === "unauthenticated" ? (
        <Link className="btn-primary" href="/sign-in">{t.nav.signIn}</Link>
      ) : onRetry ? (
        <button type="button" className="btn-ghost" onClick={onRetry}>{t.states.retry}</button>
      ) : null}
    </div>
  );
}

export function Empty({ children, icon: Glyph = Tray, action }: { children?: React.ReactNode; icon?: Icon; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border px-6 py-12 sm:items-center sm:text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-sunken text-muted">
        <Glyph size={28} aria-hidden />
      </span>
      <p className="max-w-[44ch] text-lg text-muted">{children ?? t.states.empty}</p>
      {action}
    </div>
  );
}

/** Page heading row: title on the left, optional actions on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="max-w-[60ch] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
