"use client";

import Link from "next/link";
import { ArrowBendUpLeft, Bell, ChatCircle } from "@phosphor-icons/react/ssr";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { formatDate, t } from "@/lib/i18n";

export default function NotificationsPage() {
  const { api } = useAuth();
  const page = useAsync(async () => unwrap(api.GET("/v1/notifications", { params: { query: { limit: 50 } } })), [api]);
  const unread = page.state.status === "ready" ? page.state.data.unreadCount : 0;
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title={t.nav.notifications} description={unread > 0 ? `${unread} unread` : undefined} />
      {page.state.status === "loading" ? <Loading /> : null}
      {page.state.status === "error" ? <ErrorState error={page.state.error} onRetry={page.reload} /> : null}
      {page.state.status === "ready" ? (
        page.state.data.items.length === 0 ? (
          <Empty icon={Bell}>No notifications.</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {page.state.data.items.map((n) => {
              const Glyph = n.kind === "reply-to-discussion" ? ArrowBendUpLeft : ChatCircle;
              return (
                <li
                  key={n.id}
                  className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${n.read ? "border-border bg-surface" : "border-accent/40 bg-accent-soft/50"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${n.read ? "bg-sunken text-muted" : "bg-accent text-accent-contrast"}`}>
                    <Glyph size={20} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="font-semibold">{n.actor.displayName}</strong>{" "}
                    {n.kind === "reply-to-discussion" ? "replied to your comment" : "commented on or asked about your recipe"}
                    {n.recipeTitle ? (
                      <>
                        {" on "}
                        <Link className="font-semibold text-accent-ink underline underline-offset-4" href={`/recipe/${n.recipeId}`}>{n.recipeTitle}</Link>
                      </>
                    ) : null}
                    <span className="block text-sm text-muted">{formatDate(n.createdAt)}</span>
                  </span>
                  {!n.read ? (
                    <button type="button" className="btn-quiet px-3.5 text-sm" onClick={async () => {
                      await unwrap(api.POST("/v1/notifications/{notificationId}/read", { params: { path: { notificationId: n.id } } }));
                      page.reload();
                    }}>Mark as read</button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}
