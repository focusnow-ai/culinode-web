"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api/client";
import { problemMessage, t } from "@/lib/i18n";

export function Loading() {
  return <p aria-live="polite" className="text-muted">{t.states.loading}</p>;
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const code = error instanceof ApiError ? error.code : undefined;
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-danger">
      <p>{problemMessage(code, error.message)}</p>
      {code === "unauthenticated" ? (
        <Link className="btn-primary" href="/sign-in">{t.nav.signIn}</Link>
      ) : onRetry ? (
        <button type="button" className="btn-ghost" onClick={onRetry}>{t.states.retry}</button>
      ) : null}
    </div>
  );
}

export function Empty({ children }: { children?: React.ReactNode }) {
  return <div className="card text-muted">{children ?? t.states.empty}</div>;
}
