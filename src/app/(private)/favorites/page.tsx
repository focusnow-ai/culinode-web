"use client";

import Link from "next/link";
import { Heart, HeartBreak } from "@phosphor-icons/react/ssr";
import { RecipeCard } from "@/components/RecipeCard";
import { Empty, ErrorState, Loading, PageHeader } from "@/components/States";
import { unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { t } from "@/lib/i18n";

export default function FavoritesPage() {
  const { api } = useAuth();
  const favs = useAsync(async () => (await unwrap(api.GET("/v1/favorites", { params: { query: { limit: 50 } } }))).items, [api]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.nav.favorites} />
      {favs.state.status === "loading" ? <Loading variant="grid" /> : null}
      {favs.state.status === "error" ? <ErrorState error={favs.state.error} onRetry={favs.reload} /> : null}
      {favs.state.status === "ready" ? (
        favs.state.data.length === 0 ? (
          <Empty icon={Heart} action={<Link href="/" className="btn-ghost">{t.nav.discover}</Link>}>
            No favorite recipes yet.
          </Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favs.state.data.map((f) => (
              <li key={f.recipeId}>
                {f.available && f.recipe ? (
                  <RecipeCard recipe={f.recipe} />
                ) : (
                  <div className="flex h-full min-h-48 flex-col items-start justify-center gap-2 rounded-2xl border border-dashed border-border p-5 text-muted">
                    <HeartBreak size={28} aria-hidden />
                    This recipe is no longer available (it was unpublished).
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
