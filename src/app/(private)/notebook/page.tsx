"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpenText, CaretRight, CopySimple, FolderSimple, Globe, Lock, MagnifyingGlass, Plus, Stack } from "@phosphor-icons/react/ssr";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { ApiError, newId, unwrap, type Collection, type Recipe } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { formatDate, problemMessage, t } from "@/lib/i18n";

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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t.nav.notebook}
        actions={
          <Link href="/notebook/new" className="btn-primary">
            <Plus size={18} weight="bold" aria-hidden />
            New recipe
          </Link>
        }
      />
      <div className="grid gap-8 md:grid-cols-[15rem_1fr] md:gap-10">
        <CollectionsPanel
          state={collections.state}
          selected={collectionId}
          onSelect={setCollectionId}
          onChanged={collections.reload}
        />
        <section aria-label="Recipes" className="flex min-w-0 flex-col gap-5">
          <form
            role="search"
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(q.trim());
            }}
          >
            <label className="sr-only" htmlFor="search">Search by title, ingredient or tag</label>
            <span className="relative flex-1">
              <MagnifyingGlass size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input id="search" className="input pl-11" placeholder="Title, ingredient or tag" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} />
            </span>
            <button className="btn-ghost" type="submit">Search</button>
          </form>
          {recipes.state.status === "loading" ? <Loading /> : null}
          {recipes.state.status === "error" ? <ErrorState error={recipes.state.error} onRetry={recipes.reload} /> : null}
          {recipes.state.status === "ready" ? (
            recipes.state.data.length === 0 ? (
              <Empty
                icon={query ? MagnifyingGlass : BookOpenText}
                action={query ? null : <Link href="/notebook/new" className="btn-primary"><Plus size={18} weight="bold" aria-hidden />Add a recipe</Link>}
              >
                {query ? "No recipes match your search." : "Your recipe book is empty. Add your first recipe."}
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...recipes.state.data, ...extra].map((r) => (
                  <li key={r.id}>
                    <RecipeRow r={r} />
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {continuation ? <button type="button" className="btn-ghost self-center" onClick={more}>Load more</button> : null}
        </section>
      </div>
    </div>
  );
}

function RecipeRow({ r }: { r: Recipe }) {
  const published = r.publication.status === "published";
  const total = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
  return (
    <Link
      href={`/notebook/${r.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:border-accent"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`truncate font-display text-lg font-bold ${r.title ? "" : "text-muted"}`}>{r.title || "(Untitled draft)"}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>Edited {formatDate(r.updatedAt)}</span>
          {total > 0 ? <span><span className="font-mono">{total}</span> {t.recipe.minutes}</span> : null}
          {r.tags.length > 0 ? <span className="truncate">{r.tags.slice(0, 3).map((x) => `#${x}`).join(" ")}</span> : null}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm">
        {r.source ? (
          <span className="hidden items-center gap-1 rounded-full bg-sunken px-2.5 py-1 font-medium text-muted sm:inline-flex">
            <CopySimple size={14} aria-hidden />
            Copy
          </span>
        ) : null}
        {published ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 font-semibold text-ok">
            <Globe size={14} aria-hidden />
            {t.publish.published}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-2.5 py-1 font-medium text-muted">
            <Lock size={14} aria-hidden />
            {t.publish.unpublished}
          </span>
        )}
        <CaretRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
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
  const item = (active: boolean) =>
    `flex min-h-11 w-full shrink-0 items-center gap-2.5 rounded-full px-4 text-left font-medium transition-colors md:rounded-xl ${
      active ? "bg-foreground text-background" : "hover:bg-sunken"
    }`;
  return (
    <aside aria-label="Collections" className="flex min-w-0 flex-col gap-3 md:sticky md:top-24 md:self-start">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Collections</h2>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0">
        <button type="button" className={`${item(selected === null)} w-auto md:w-full`} aria-pressed={selected === null} onClick={() => onSelect(null)}>
          <Stack size={18} aria-hidden />
          All recipes
        </button>
        {state.status === "loading" ? <div className="skeleton h-11 w-40 shrink-0 md:w-full" aria-hidden /> : null}
        {state.status === "ready"
          ? state.data.map((c) => (
              <button key={c.id} type="button" aria-pressed={selected === c.id} className={`${item(selected === c.id)} w-auto md:w-full`} onClick={() => onSelect(c.id)}>
                <FolderSimple size={18} aria-hidden />
                <span className="truncate">{c.name}</span>
                <span className={`ml-auto font-mono text-sm ${selected === c.id ? "opacity-70" : "text-muted"}`}>{c.recipeIds.length}</span>
              </button>
            ))
          : null}
      </div>
      {state.status === "error" ? <p className="text-sm text-danger">Could not load collections.</p> : null}
      <form
        className="flex gap-1.5"
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
        <label className="sr-only" htmlFor="new-collection">New collection name</label>
        <input id="new-collection" className="input min-h-11 py-2 text-[0.95rem]" placeholder="New collection" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <button className="btn size-11 px-0" type="submit" aria-label="Add collection">
          <Plus size={18} weight="bold" aria-hidden />
        </button>
      </form>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </aside>
  );
}
