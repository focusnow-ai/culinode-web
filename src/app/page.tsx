import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react/ssr";
import { RecipeGrid } from "@/components/RecipeCard";
import { ApiError, serverPublicClient, unwrap } from "@/lib/api/client";
import { problemMessage, t } from "@/lib/i18n";

// Fresh public data on every request; no user-specific data in SSR.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.nav.discover,
  alternates: { canonical: "/" },
};

type Search = { q?: string; tag?: string; ingredient?: string; c?: string };
type Filters = { q?: string; tag?: string; ingredient?: string };

function loadPage(filters: Filters, continuation?: string) {
  return unwrap(
    serverPublicClient().GET("/v1/public/recipes", { params: { query: { ...filters, limit: 24, continuation } } }),
  );
}

function hrefWithout(filters: Filters, key: keyof Filters) {
  const p = new URLSearchParams(Object.entries({ ...filters, [key]: undefined }).filter(([, v]) => v) as [string, string][]);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function DiscoverPage({ searchParams }: PageProps<"/">) {
  const sp = (await searchParams) as Search;
  const filters: Filters = { q: sp.q?.slice(0, 80), tag: sp.tag?.slice(0, 40), ingredient: sp.ingredient?.slice(0, 60) };
  const filtered = !!(filters.q || filters.tag || filters.ingredient);
  let page: Awaited<ReturnType<typeof loadPage>> | null = null;
  let errorCode: string | undefined;
  try {
    page = await loadPage(filters, sp.c);
  } catch (e) {
    errorCode = e instanceof ApiError ? e.code : "internal";
  }
  const next = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  if (page?.continuation) next.set("c", page.continuation);

  const active = (
    [
      ["q", "Title", filters.q],
      ["tag", "Tag", filters.tag],
      ["ingredient", "Ingredient", filters.ingredient],
    ] as const
  ).filter(([, , v]) => v);

  const content = !page ? (
    <div role="alert" className="card border-danger/40 bg-danger-soft text-danger">{problemMessage(errorCode)}</div>
  ) : page.items.length === 0 ? (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border px-6 py-12 sm:items-center sm:text-center">
      <MagnifyingGlass size={36} className="text-muted" aria-hidden />
      <p className="text-lg font-semibold">No published recipes match these filters.</p>
      <Link className="btn-ghost" href="/">Clear filters</Link>
    </div>
  ) : (
    <>
      <RecipeGrid recipes={page.items} feature={!filtered && !sp.c} />
      {page.continuation ? (
        <div className="mt-10 flex justify-center">
          <Link className="btn-ghost" href={`/?${next.toString()}`}>
            More recipes
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-12">
      <section className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-4">
          <h1 className="max-w-[16ch] font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Recipes from chefs&apos; own notebooks.
          </h1>
          <p className="max-w-[46ch] text-lg text-muted">
            Every recipe here started in a private Culinode notebook and was shared by the chef who wrote it.
          </p>
        </div>
        <form role="search" action="/" className="card grid grid-cols-2 gap-4 p-5 sm:p-6">
          <label className="col-span-2 flex flex-col gap-2">
            <span className="field-label">Recipe title</span>
            <span className="relative">
              <MagnifyingGlass size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input className="input pl-11" name="q" defaultValue={filters.q} maxLength={80} />
            </span>
          </label>
          <label className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="field-label">Tag</span>
            <input className="input" name="tag" defaultValue={filters.tag} maxLength={40} />
          </label>
          <label className="col-span-2 flex flex-col gap-2 sm:col-span-1">
            <span className="field-label">Ingredient</span>
            <input className="input" name="ingredient" defaultValue={filters.ingredient} maxLength={60} />
          </label>
          <div className="col-span-2 flex gap-2">
            <button className="btn-primary flex-1 sm:flex-none" type="submit">
              Search
            </button>
            <Link className="btn-quiet" href="/">
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section aria-labelledby="recipes-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="recipes-heading" className="section-title mr-2">
            {filtered ? "Matching recipes" : "New recipes"}
          </h2>
          {active.map(([key, label, value]) => (
            <Link key={key} href={hrefWithout(filters, key)} className="chip" aria-label={`Remove ${label.toLowerCase()} filter ${value}`}>
              <span className="text-muted">{label}:</span> {value}
              <X size={14} weight="bold" aria-hidden />
            </Link>
          ))}
        </div>
        {content}
      </section>
    </div>
  );
}
