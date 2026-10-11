"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  if (!ready) return <p aria-live="polite">{tr.states.loading}</p>;
  if (!user)
    return (
      <div className="card flex flex-col items-start gap-3">
        <p>{tr.states.unauthorized}</p>
        <Link className="btn-primary" href={`/giris?next=${encodeURIComponent(path)}`}>{tr.nav.signIn}</Link>
      </div>
    );
  return <>{children}</>;
}
