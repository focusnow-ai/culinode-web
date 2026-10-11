import Link from "next/link";
import type { Metadata } from "next";
import { RecipeCard } from "@/components/RecipeCard";
import { ApiError, serverPublicClient, unwrap } from "@/lib/api/client";
import { problemMessage, t } from "@/lib/i18n";

// Fresh public data on every request; no user-specific data in SSR.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.nav.discover,
  alternates: { canonical: "/" },
};

type Search = { q?: string; tag?: string; ingredient?: string; c?: string };

function loadPage(filters: { q?: string; tag?: string; ingredient?: string }, continuation?: string) {
  return unwrap(
    serverPublicClient().GET("/v1/public/recipes", { params: { query: { ...filters, limit: 24, continuation } } }),
  );
}

export default async function DiscoverPage({ searchParams }: PageProps<"/">) {
  const sp = (await searchParams) as Search;
  const filters = { q: sp.q?.slice(0, 80), tag: sp.tag?.slice(0, 40), ingredient: sp.ingredient?.slice(0, 60) };
  let page: Awaited<ReturnType<typeof loadPage>> | null = null;
  let errorCode: string | undefined;
  try {
    page = await loadPage(filters, sp.c);
  } catch (e) {
    errorCode = e instanceof ApiError ? e.code : "internal";
  }
  const next = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  if (page?.continuation) next.set("c", page.continuation);

  const content = !page ? (
    <div role="alert" className="card border-danger">{problemMessage(errorCode)}</div>
  ) : page.items.length === 0 ? (
    <p className="card text-muted">No published recipes match these filters.</p>
  ) : (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {page.items.map((r) => (
          <li key={r.id}>
            <RecipeCard recipe={r} />
          </li>
        ))}
      </ul>
      {page.continuation ? (
        <div className="mt-6 text-center">
          <Link className="btn-ghost" href={`/?${next.toString()}`}>More recipes</Link>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">New recipes</h1>
        <p className="text-muted">Recipes chefs have shared publicly.</p>
      </section>
      <form role="search" className="card grid grid-cols-1 gap-3 sm:grid-cols-4" action="/">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-semibold">Recipe title</span>
          <input className="input" name="q" defaultValue={filters.q} maxLength={80} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Tag</span>
          <input className="input" name="tag" defaultValue={filters.tag} maxLength={40} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Ingredient</span>
          <input className="input" name="ingredient" defaultValue={filters.ingredient} maxLength={60} />
        </label>
        <div className="flex gap-2 sm:col-span-4">
          <button className="btn-primary" type="submit">
            Search
          </button>
          <Link className="btn-ghost" href="/">
            Clear
          </Link>
        </div>
      </form>
      {content}
    </div>
  );
}
