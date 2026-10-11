"use client";

import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorState, Loading } from "@/components/States";
import { ApiError, newId, unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { formatDate, problemMessage } from "@/lib/i18n";

export default function ModerationPage() {
  const { api } = useAuth();
  const reports = useAsync(async () => unwrap(api.GET("/v1/admin/reports", { params: { query: { status: "open", limit: 50 } } })), [api]);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(body: { action: "remove-discussion" | "unpublish-recipe" | "restrict-user" | "resolve-report"; recipeId?: string; discussionId?: string; userId?: string; reportId?: string }) {
    try {
      await unwrap(api.POST("/v1/admin/actions", { body: { operationId: newId(), ...body } }));
      setMsg("Uygulandı.");
      reports.reload();
    } catch (e) {
      setMsg(problemMessage(e instanceof ApiError ? e.code : undefined));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Moderasyon</h1>
      {msg ? <p role="status">{msg}</p> : null}
      {reports.state.status === "loading" ? <Loading /> : null}
      {reports.state.status === "error" ? <ErrorState error={reports.state.error} onRetry={reports.reload} /> : null}
      {reports.state.status === "ready" ? (
        reports.state.data.items.length === 0 ? <Empty>Açık bildirim yok.</Empty> : (
          <ul className="flex flex-col gap-2">
            {reports.state.data.items.map((r) => (
              <li key={r.id} className="card flex flex-col gap-2">
                <p><strong>{r.targetType}</strong> · {r.reason} · {formatDate(r.createdAt)}</p>
                {r.detail ? <p className="text-sm">{r.detail}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {r.targetType === "recipe" ? (
                    <>
                      <Link className="btn-ghost" href={`/tarif/${r.targetId}`}>Tarifi aç</Link>
                      <button type="button" className="btn-danger" onClick={() => act({ action: "unpublish-recipe", recipeId: r.targetId })}>Yayından kaldır</button>
                    </>
                  ) : null}
                  {r.targetType === "discussion" && r.recipeId ? (
                    <button type="button" className="btn-danger" onClick={() => act({ action: "remove-discussion", recipeId: r.recipeId!, discussionId: r.targetId })}>Girdiyi kaldır</button>
                  ) : null}
                  {r.targetType === "user" ? (
                    <button type="button" className="btn-danger" onClick={() => act({ action: "restrict-user", userId: r.targetId })}>Hesabı kısıtla</button>
                  ) : null}
                  <button type="button" className="btn-ghost" onClick={() => act({ action: "resolve-report", reportId: r.id })}>Çözüldü</button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
