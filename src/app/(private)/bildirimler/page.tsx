"use client";

import Link from "next/link";
import { Empty, ErrorState, Loading } from "@/components/States";
import { unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { formatDate, tr } from "@/lib/i18n";

export default function NotificationsPage() {
  const { api } = useAuth();
  const page = useAsync(async () => unwrap(api.GET("/v1/notifications", { params: { query: { limit: 50 } } })), [api]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{tr.nav.notifications}</h1>
      {page.state.status === "loading" ? <Loading /> : null}
      {page.state.status === "error" ? <ErrorState error={page.state.error} onRetry={page.reload} /> : null}
      {page.state.status === "ready" ? (
        page.state.data.items.length === 0 ? (
          <Empty>Bildiriminiz yok.</Empty>
        ) : (
          <>
            <p className="text-sm text-muted">{page.state.data.unreadCount} okunmamış</p>
            <ul className="flex flex-col gap-2">
              {page.state.data.items.map((n) => (
                <li key={n.id} className={`card flex flex-wrap items-center justify-between gap-2 ${n.read ? "" : "border-accent"}`}>
                  <span>
                    <strong>{n.actor.displayName}</strong>{" "}
                    {n.kind === "reply-to-discussion" ? "yorumunuza yanıt verdi" : "tarifinize yorum/soru yazdı"}
                    {n.recipeTitle ? <> — <Link className="underline" href={`/tarif/${n.recipeId}`}>{n.recipeTitle}</Link></> : null}
                    <span className="block text-sm text-muted">{formatDate(n.createdAt)}</span>
                  </span>
                  {!n.read ? (
                    <button type="button" className="btn-ghost" onClick={async () => {
                      await unwrap(api.POST("/v1/notifications/{notificationId}/read", { params: { path: { notificationId: n.id } } }));
                      page.reload();
                    }}>Okundu</button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </div>
  );
}
