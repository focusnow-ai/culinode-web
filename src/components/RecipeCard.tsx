import Link from "next/link";
import type { PublicRecipeSummary } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/client";
import { t } from "@/lib/i18n";

export function RecipeCard({ recipe }: { recipe: PublicRecipeSummary }) {
  const total = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  return (
    <article className="card flex flex-col gap-2">
      {recipe.cover ? (
        // The cover image goes through the API, which checks publication status and redirects to a short-lived link.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={apiUrl(recipe.cover.thumbUrl)}
          alt=""
          loading="lazy"
          width={400}
          height={300}
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-background text-4xl" aria-hidden>
          🍲
        </div>
      )}
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
        <Link href={`/recipe/${recipe.id}`} className="hover:underline">
          {recipe.title}
        </Link>
      </h2>
      <p className="text-sm text-muted">
        <Link href={`/chef/${encodeURIComponent(recipe.author.id)}`} className="underline-offset-2 hover:underline">
          {recipe.author.displayName}
        </Link>
        {total > 0 ? ` · ${total} ${t.recipe.minutes}` : null}
      </p>
      {recipe.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-label={t.recipe.tags}>
          {recipe.tags.map((t) => (
            <li key={t}>
              <Link href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full border border-border px-2 py-0.5 text-sm">
                #{t}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
