"use client";

import Link from "next/link";
import { useState } from "react";
import { Empty, ErrorState, Loading } from "@/components/States";
import { ApiError, newId, unwrap, type Collection, type Recipe } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { problemMessage, tr } from "@/lib/i18n";

export default function NotebookPage() {
  const { api } = useAuth();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [extra, setExtra] = useState<Recipe[]>([]);
  const [continuation, setContinuation] = useState<string | null>(null);

  const recipes = useAsync(async () => {
    const page = await unwrap(
      api.GET("/v1/recipes", { params: { query: { q: query || undefined, collectionId: collectionId ?? undefined, limit: 30 } } }),
    );
    setExtra([]);
    setContinuation(page.continuation ?? null);
    return page.items;
  }, [api, query, collectionId]);

  const collections = useAsync(async () => (await unwrap(api.GET("/v1/collections", { params: { query: { limit: 50 } } }))).items, [api]);

  async function more() {
    const page = await unwrap(
      api.GET("/v1/recipes", {
        params: { query: { q: query || undefined, collectionId: collectionId ?? undefined, limit: 30, continuation: continuation ?? undefined } },
      }),
    );
    setExtra((prev) => [...prev, ...page.items]);
    setContinuation(page.continuation ?? null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{tr.nav.notebook}</h1>
        <Link href="/defter/yeni" className="btn-primary">+ Yeni tarif</Link>
      </div>
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <label className="sr-only" htmlFor="ara">Ad, malzeme veya etiketle ara</label>
        <input id="ara" className="input" placeholder="Ad, malzeme veya etiket" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} />
        <button className="btn-ghost" type="submit">Ara</button>
      </form>
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <CollectionsPanel
          state={collections.state}
          selected={collectionId}
          onSelect={setCollectionId}
          onChanged={collections.reload}
        />
        <section aria-label="Tarifler">
          {recipes.state.status === "loading" ? <Loading /> : null}
          {recipes.state.status === "error" ? <ErrorState error={recipes.state.error} onRetry={recipes.reload} /> : null}
          {recipes.state.status === "ready" ? (
            recipes.state.data.length === 0 ? (
              <Empty>{query ? "Aramanızla eşleşen tarif yok." : "Defteriniz boş. İlk tarifinizi ekleyin."}</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...recipes.state.data, ...extra].map((r) => (
                  <li key={r.id}>
                    <Link href={`/defter/${r.id}`} className="card flex items-center justify-between gap-3 hover:border-accent">
                      <span className="font-semibold">{r.title || "(Adsız taslak)"}</span>
                      <span className="flex gap-2 text-sm text-muted">
                        {r.source ? <span>Kopya</span> : null}
                        {r.publication.status === "published" ? <span className="text-ok">{tr.publish.published}</span> : <span>{tr.publish.unpublished}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {continuation ? <button type="button" className="btn-ghost mt-3" onClick={more}>Daha fazla</button> : null}
        </section>
      </div>
    </div>
  );
}

function CollectionsPanel({
  state, selected, onSelect, onChanged,
}: {
  state: ReturnType<typeof useAsync<Collection[]>>["state"];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChanged: () => void;
}) {
  const { api } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <aside aria-label="Koleksiyonlar" className="flex flex-col gap-2">
      <h2 className="font-bold">Koleksiyonlar</h2>
      <button type="button" className={`text-left ${selected === null ? "font-bold" : ""}`} aria-pressed={selected === null} onClick={() => onSelect(null)}>
        Tüm tarifler
      </button>
      {state.status === "ready"
        ? state.data.map((c) => (
            <button key={c.id} type="button" aria-pressed={selected === c.id} className={`text-left ${selected === c.id ? "font-bold" : ""}`} onClick={() => onSelect(c.id)}>
              {c.name} <span className="text-sm text-muted">({c.recipeIds.length})</span>
            </button>
          ))
        : null}
      {state.status === "error" ? <p className="text-sm text-danger">Koleksiyonlar yüklenemedi.</p> : null}
      <form
        className="mt-2 flex gap-1"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setError(null);
          try {
            await unwrap(api.POST("/v1/collections", { body: { operationId: newId(), collectionId: newId(), content: { name: name.trim(), recipeIds: [] } } }));
            setName("");
            onChanged();
          } catch (err) {
            setError(problemMessage(err instanceof ApiError ? err.code : undefined));
          }
        }}
      >
        <label className="sr-only" htmlFor="yeni-koleksiyon">Yeni koleksiyon adı</label>
        <input id="yeni-koleksiyon" className="input" placeholder="Yeni koleksiyon" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <button className="btn-ghost" type="submit" aria-label="Koleksiyon ekle">+</button>
      </form>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </aside>
  );
}
