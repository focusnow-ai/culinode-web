import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CookingPot, Timer, Users } from "@phosphor-icons/react/ssr";
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
  const stats = [
    r.prepMinutes ? { icon: Timer, label: "Prep", value: r.prepMinutes, unit: t.recipe.minutes } : null,
    r.cookMinutes ? { icon: CookingPot, label: "Cook", value: r.cookMinutes, unit: t.recipe.minutes } : null,
    r.yield?.amount ? { icon: Users, label: t.recipe.yield, value: r.yield.amount, unit: r.yield.unit ?? "" } : null,
  ].filter((s) => s !== null);

  return (
    <article className="flex flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className={`grid gap-8 ${r.cover ? "lg:grid-cols-[1fr_1.15fr] lg:items-center" : ""}`}>
        <div className="flex flex-col gap-5">
          <p className="text-muted">
            <Link href={`/chef/${encodeURIComponent(r.author.id)}`} className="font-semibold text-foreground underline-offset-4 hover:underline">
              {r.author.displayName}
            </Link>
            <span aria-hidden> · </span>
            {formatDate(r.publishedAt)}
          </p>
          <h1 className="max-w-[20ch] font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{r.title}</h1>
          {r.description ? <p className="max-w-[60ch] text-lg text-muted">{r.description}</p> : null}
          {stats.length > 0 ? (
            <dl className="flex flex-wrap gap-3">
              {stats.map((s) => {
                const Glyph = s.icon;
                return (
                  <div key={s.label} className="flex min-w-28 items-center gap-3 rounded-2xl bg-sunken px-4 py-3">
                    <Glyph size={22} className="text-accent" aria-hidden />
                    <div className="flex flex-col leading-tight">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</dt>
                      <dd className="font-semibold">
                        <span className="font-mono">{s.value}</span> {s.unit}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          ) : null}
          <PublicRecipeActions recipeId={r.id} authorId={r.author.id} copyAllowed={r.copyAllowed} />
        </div>
        {r.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={apiUrl(r.cover.largeUrl)}
            alt={r.title}
            width={1600}
            height={1200}
            fetchPriority="high"
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
        ) : null}
      </header>

      <div className="grid gap-10 md:grid-cols-[minmax(16rem,1fr)_2fr] md:gap-12">
        <section aria-labelledby="ingredients" className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl bg-sunken p-5 sm:p-6">
            <h2 id="ingredients" className="section-title mb-4">{t.recipe.ingredients}</h2>
            <ul className="flex flex-col divide-y divide-border">
              {r.ingredients.map((i) => (
                <li key={i.id} className="flex flex-col py-2.5 first:pt-0 last:pb-0">
                  <span>
                    <span className="font-mono font-medium text-accent-ink">{formatQuantity(i.quantity)}</span> {i.name}
                  </span>
                  {i.note ? <span className="text-sm text-muted">{i.note}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section aria-labelledby="method">
          <h2 id="method" className="section-title mb-6">{t.recipe.steps}</h2>
          <ol className="flex flex-col gap-7">
            {r.steps.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[2.5rem_1fr] gap-4">
                <span className="grid size-10 place-items-center rounded-full border-2 border-accent font-mono font-medium text-accent-ink" aria-hidden>
                  {i + 1}
                </span>
                <p className="pt-1.5 text-lg leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
          {r.tags.length > 0 ? (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label={t.recipe.tags}>
              {r.tags.map((tag) => (
                <li key={tag}><Link className="chip" href={`/?tag=${encodeURIComponent(tag)}`}>#{tag}</Link></li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="border-t border-border pt-10">
        <DiscussionThread recipeId={r.id} authorId={r.author.id} initial={discussions.items} initialContinuation={discussions.continuation ?? null} />
      </div>
    </article>
  );
}
