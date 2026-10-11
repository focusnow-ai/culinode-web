import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BowlFood } from "@phosphor-icons/react/ssr";
import { RecipeGrid } from "@/components/RecipeCard";
import { getPublicChef } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/chef/[id]">): Promise<Metadata> {
  const { id } = await params;
  const chef = await getPublicChef(decodeURIComponent(id));
  if (!chef) return { title: "Chef not found", robots: { index: false } };
  return { title: chef.displayName, description: chef.bio || `Recipes by ${chef.displayName}`, alternates: { canonical: `/chef/${id}` } };
}

export default async function ChefPage({ params, searchParams }: PageProps<"/chef/[id]">) {
  const { id } = await params;
  const { c } = (await searchParams) as { c?: string };
  const chef = await getPublicChef(decodeURIComponent(id), c);
  if (!chef) notFound();
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        <span className="grid size-24 shrink-0 place-items-center rounded-3xl bg-accent font-display text-5xl font-extrabold text-accent-contrast" aria-hidden>
          {chef.displayName.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="page-title">{chef.displayName}</h1>
          {chef.bio ? <p className="max-w-[60ch] whitespace-pre-line text-lg text-muted">{chef.bio}</p> : null}
        </div>
      </header>
      <section aria-labelledby="published" className="flex flex-col gap-6">
        <h2 id="published" className="section-title">Published recipes</h2>
        {chef.recipes.items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border px-6 py-12 sm:items-center">
            <BowlFood size={36} className="text-muted" aria-hidden />
            <p className="text-lg text-muted">No published recipes yet.</p>
          </div>
        ) : (
          <RecipeGrid recipes={chef.recipes.items} />
        )}
        {chef.recipes.continuation ? (
          <Link className="btn-ghost self-center" href={`/chef/${id}?c=${encodeURIComponent(chef.recipes.continuation)}`}>
            Load more
            <ArrowRight size={18} aria-hidden />
          </Link>
        ) : null}
      </section>
    </div>
  );
}
