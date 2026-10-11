"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, newId, unwrap, type Recipe } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { problemMessage, tr } from "@/lib/i18n";

/** Kendi taslağı ile yayınlanan sürümü ayırır; yayınla / güncelle / kaldır yalnız online ve sunucu onaylı. */
export function PublishPanel({ recipe, dirty, onChanged }: { recipe: Recipe; dirty: boolean; onChanged: (r: Recipe) => void }) {
  const { api } = useAuth();
  const published = recipe.publication.status === "published";
  const [copyAllowed, setCopyAllowed] = useState(recipe.publication.copyAllowed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; fields?: Record<string, string[]> } | null>(null);
  const draftNewer = published && (recipe.publication.publishedRevision ?? 0) < recipe.contentRevision;

  async function act(kind: "publish" | "unpublish") {
    setBusy(true);
    setError(null);
    try {
      if (kind === "publish") {
        await unwrap(api.POST("/v1/recipes/{recipeId}/publish", {
          params: { path: { recipeId: recipe.id } },
          body: { operationId: newId(), revision: recipe.revision, copyAllowed },
        }));
      } else {
        if (!confirm("Tarif yayından kaldırılsın mı? Daha önce kopyalayanların kopyaları etkilenmez.")) return;
        await unwrap(api.POST("/v1/recipes/{recipeId}/unpublish", { params: { path: { recipeId: recipe.id } }, body: { operationId: newId() } }));
      }
      onChanged(await unwrap(api.GET("/v1/recipes/{recipeId}", { params: { path: { recipeId: recipe.id } } })));
    } catch (e) {
      setError({ text: problemMessage(e instanceof ApiError ? e.code : undefined), fields: e instanceof ApiError ? e.problem?.errors ?? undefined : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="yayin" className="card flex flex-col gap-3">
      <h2 id="yayin" className="text-xl font-bold">Yayın</h2>
      <p>
        Durum: <strong className={published ? "text-ok" : ""}>{published ? tr.publish.published : tr.publish.unpublished}</strong>
        {published ? <> · <Link className="underline" href={`/tarif/${recipe.id}`}>Public sayfayı aç</Link></> : null}
      </p>
      {draftNewer ? <p className="text-sm">{tr.publish.draftNewer}</p> : null}
      <p className="text-sm text-muted">Özel notunuz hiçbir zaman yayınlanmaz.</p>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={copyAllowed} onChange={(e) => setCopyAllowed(e.target.checked)} />
        {tr.publish.copyAllowed}
      </label>
      {dirty ? <p className="text-sm text-danger">Yayınlamadan önce değişiklikleri kaydedin.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || dirty} onClick={() => act("publish")}>
          {published ? tr.publish.update : tr.publish.publish}
        </button>
        {published ? (
          <button type="button" className="btn-danger" disabled={busy} onClick={() => act("unpublish")}>{tr.publish.unpublish}</button>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="text-danger">
          <p>{error.text}</p>
          {error.fields ? <ul className="list-disc pl-5 text-sm">{Object.values(error.fields).flat().map((m, i) => <li key={i}>{m}</li>)}</ul> : null}
        </div>
      ) : null}
    </section>
  );
}
