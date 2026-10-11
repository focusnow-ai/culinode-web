"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react/ssr";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Loading } from "./States";
import { StatusPage } from "./StatusPage";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  if (!ready) return <Loading />;
  if (!user)
    return (
      <StatusPage
        icon={LockKey}
        title={t.nav.signIn}
        actions={<Link className="btn-primary" href={`/sign-in?next=${encodeURIComponent(path)}`}>{t.nav.signIn}</Link>}
      >
        {t.states.unauthorized}
      </StatusPage>
    );
  return <>{children}</>;
}
