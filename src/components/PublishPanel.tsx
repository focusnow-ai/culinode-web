"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, newId, unwrap, type Recipe } from "@/lib/api/client";
import { ArrowSquareOut, Globe, Lock } from "@phosphor-icons/react/ssr";
import { useAuth } from "@/lib/auth";
import { problemMessage, t } from "@/lib/i18n";

/** Separates the owner's draft from the published version; publish / update / unpublish are online only and server-confirmed. */
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
        if (!confirm("Unpublish this recipe? Copies people already made are not affected.")) return;
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
    <section aria-labelledby="publishing" className="card flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="publishing" className="section-title mr-auto">Publishing</h2>
        <p className="flex flex-wrap items-center gap-3">
          <span className="sr-only">Status: </span>
          {published ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok"><Globe size={16} aria-hidden />{t.publish.published}</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-sm font-semibold text-muted"><Lock size={16} aria-hidden />{t.publish.unpublished}</span>
          )}
          {published ? (
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-accent-ink underline underline-offset-4" href={`/recipe/${recipe.id}`}>
              Open public page<ArrowSquareOut size={16} aria-hidden />
            </Link>
          ) : null}
        </p>
      </div>
      {draftNewer ? <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent-ink">{t.publish.draftNewer}</p> : null}
      <p className="text-sm text-muted">Your private note is never published.</p>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={copyAllowed} onChange={(e) => setCopyAllowed(e.target.checked)} />
        {t.publish.copyAllowed}
      </label>
      {dirty ? <p className="text-sm font-medium text-danger">Save your changes before publishing.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy || dirty} onClick={() => act("publish")}>
          {published ? t.publish.update : t.publish.publish}
        </button>
        {published ? (
          <button type="button" className="btn-danger" disabled={busy} onClick={() => act("unpublish")}>{t.publish.unpublish}</button>
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
