import Link from "next/link";
import { Clock, ForkKnife } from "@phosphor-icons/react/ssr";
import type { PublicRecipeSummary } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/client";
import { t } from "@/lib/i18n";

/** Public recipe summary. The whole card opens the recipe; author and tag links sit above the stretched link. */
export function RecipeCard({ recipe, featured = false }: { recipe: PublicRecipeSummary; featured?: boolean }) {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[border-color,box-shadow] duration-300 hover:border-muted/40 hover:shadow-[0_12px_32px_-12px_hsl(var(--shadow)/0.25)]">
      <div className={`relative overflow-hidden bg-sunken ${featured ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:min-h-72 lg:flex-1" : "aspect-[16/10]"}`}>
        {recipe.cover ? (
          // The cover image goes through the API, which checks publication status and redirects to a short-lived link.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={apiUrl(featured ? recipe.cover.largeUrl : recipe.cover.thumbUrl)}
            alt=""
            loading={featured ? "eager" : "lazy"}
            width={featured ? 1200 : 400}
            height={featured ? 900 : 300}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-sunken text-muted/50" aria-hidden>
            <ForkKnife size={featured ? 56 : 40} weight="duotone" />
          </div>
        )}
      </div>
      <div className={`flex flex-col gap-2 ${featured ? "p-6" : "p-4"}`}>
        <h3 className={`font-display font-bold leading-tight ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}>
          <Link href={`/recipe/${recipe.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-2xl after:focus-visible:outline-3 after:focus-visible:outline-accent">
            {recipe.title}
          </Link>
        </h3>
        {featured && recipe.description ? <p className="line-clamp-2 max-w-[60ch] text-muted">{recipe.description}</p> : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <Link
            href={`/chef/${encodeURIComponent(recipe.author.id)}`}
            className="relative z-10 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {recipe.author.displayName}
          </Link>
          {total > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={16} aria-hidden />
              <span className="font-mono">{total}</span> {t.recipe.minutes}
            </span>
          ) : null}
        </p>
        {recipe.tags.length > 0 ? (
          <ul className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-1" aria-label={t.recipe.tags}>
            {recipe.tags.slice(0, featured ? 5 : 3).map((tag) => (
              <li key={tag}>
                <Link href={`/?tag=${encodeURIComponent(tag)}`} className="chip min-h-8 px-3 text-[0.8rem]">
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface" aria-hidden>
      <div className="skeleton aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Recipe grid. With `feature`, the first recipe gets a larger tile so the page has a lead story. */
export function RecipeGrid({ recipes, feature = false }: { recipes: PublicRecipeSummary[]; feature?: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r, i) => {
        // Only a recipe with a photo can carry the lead tile.
        const lead = feature && i === 0 && recipes.length >= 3 && !!r.cover;
        return (
          <li key={r.id} className={lead ? "sm:col-span-2 lg:row-span-2" : undefined}>
            <RecipeCard recipe={r} featured={lead} />
          </li>
        );
      })}
    </ul>
  );
}
