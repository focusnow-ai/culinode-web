import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicRecipeActions } from "@/components/PublicRecipeActions";
import { DiscussionThread } from "@/components/DiscussionThread";
import { apiUrl } from "@/lib/api/client";
import { formatDate, formatQuantity, t } from "@/lib/i18n";
import { getDiscussions, getPublicRecipe, recipeJsonLd } from "@/lib/public-data";

// Publication status is checked on every request: an unpublished recipe returns 404 on the next request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/recipe/[id]">): Promise<Metadata> {
  const { id } = await params;
  const r = await getPublicRecipe(id);
  if (!r) return { title: "Recipe not found", robots: { index: false } };
  const image = r.cover ? apiUrl(r.cover.largeUrl) : undefined;
  return {
    title: r.title,
    description: r.description ?? `A recipe shared by ${r.author.displayName}.`,
    alternates: { canonical: `/recipe/${r.id}` },
    openGraph: { type: "article", title: r.title, description: r.description ?? undefined, images: image ? [image] : undefined },
  };
}

export default async function RecipePage({ params }: PageProps<"/recipe/[id]">) {
  const { id } = await params;
  const r = await getPublicRecipe(id);
  if (!r) notFound();
  const discussions = await getDiscussions(id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const jsonLd = recipeJsonLd(r, siteUrl, r.cover ? apiUrl(r.cover.largeUrl) : null);

  return (
    <article className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">{r.title}</h1>
        <p className="text-muted">
          <Link href={`/chef/${encodeURIComponent(r.author.id)}`} className="font-semibold underline-offset-2 hover:underline">
            {r.author.displayName}
          </Link>{" "}
          · {formatDate(r.publishedAt)}
        </p>
        {r.description ? <p className="text-lg">{r.description}</p> : null}
        <dl className="flex flex-wrap gap-4 text-sm">
          {r.yield?.amount ? (
            <div><dt className="inline font-semibold">{t.recipe.yield}: </dt><dd className="inline">{r.yield.amount} {r.yield.unit}</dd></div>
          ) : null}
          {r.prepMinutes ? (
            <div><dt className="inline font-semibold">Prep: </dt><dd className="inline">{r.prepMinutes} {t.recipe.minutes}</dd></div>
          ) : null}
          {r.cookMinutes ? (
            <div><dt className="inline font-semibold">Cook: </dt><dd className="inline">{r.cookMinutes} {t.recipe.minutes}</dd></div>
          ) : null}
        </dl>
      </header>
      {r.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={apiUrl(r.cover.largeUrl)} alt={r.title} width={1600} height={1200} className="max-h-[60vh] w-full rounded-xl object-cover" />
      ) : null}
      <PublicRecipeActions recipeId={r.id} authorId={r.author.id} copyAllowed={r.copyAllowed} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <section aria-labelledby="ingredients" className="card">
          <h2 id="ingredients" className="mb-3 text-2xl font-bold">{t.recipe.ingredients}</h2>
          <ul className="flex flex-col gap-2">
            {r.ingredients.map((i) => (
              <li key={i.id} className="flex flex-col">
                <span><strong>{formatQuantity(i.quantity)}</strong> {i.name}</span>
                {i.note ? <span className="text-sm text-muted">{i.note}</span> : null}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="method" className="card">
          <h2 id="method" className="mb-3 text-2xl font-bold">{t.recipe.steps}</h2>
          <ol className="flex list-decimal flex-col gap-3 pl-6">
            {r.steps.map((s) => (
              <li key={s.id} className="text-lg">{s.text}</li>
            ))}
          </ol>
        </section>
      </div>
      {r.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t.recipe.tags}>
          {r.tags.map((t) => (
            <li key={t}><Link className="rounded-full border border-border px-3 py-1" href={`/?tag=${encodeURIComponent(t)}`}>#{t}</Link></li>
          ))}
        </ul>
      ) : null}
      <DiscussionThread recipeId={r.id} authorId={r.author.id} initial={discussions.items} initialContinuation={discussions.continuation ?? null} />
    </article>
  );
}
