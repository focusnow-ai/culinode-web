import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeCard } from "@/components/RecipeCard";
import { getPublicChef } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/chef/[id]">): Promise<Metadata> {
  const { id } = await params;
  const chef = await getPublicChef(decodeURIComponent(id));
  if (!chef) return { title: "Chef not found", robots: { index: false } };
  return { title: chef.displayName, description: chef.bio || `${chef.displayName} tarifleri`, alternates: { canonical: `/chef/${id}` } };
}

export default async function ChefPage({ params, searchParams }: PageProps<"/chef/[id]">) {
  const { id } = await params;
  const { c } = (await searchParams) as { c?: string };
  const chef = await getPublicChef(decodeURIComponent(id), c);
  if (!chef) notFound();
  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{chef.displayName}</h1>
        {chef.bio ? <p className="mt-2 whitespace-pre-line">{chef.bio}</p> : null}
      </header>
      <h2 className="text-2xl font-bold">Published recipes</h2>
      {chef.recipes.items.length === 0 ? (
        <p className="card text-muted">No published recipes yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chef.recipes.items.map((r) => (
            <li key={r.id}><RecipeCard recipe={r} /></li>
          ))}
        </ul>
      )}
      {chef.recipes.continuation ? (
        <Link className="btn-ghost self-center" href={`/chef/${id}?c=${encodeURIComponent(chef.recipes.continuation)}`}>Load more</Link>
      ) : null}
    </div>
  );
}
