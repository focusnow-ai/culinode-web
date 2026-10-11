"use client";

import { RecipeCard } from "@/components/RecipeCard";
import { Empty, ErrorState, Loading } from "@/components/States";
import { unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";
import { tr } from "@/lib/i18n";

export default function FavoritesPage() {
  const { api } = useAuth();
  const favs = useAsync(async () => (await unwrap(api.GET("/v1/favorites", { params: { query: { limit: 50 } } }))).items, [api]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{tr.nav.favorites}</h1>
      {favs.state.status === "loading" ? <Loading /> : null}
      {favs.state.status === "error" ? <ErrorState error={favs.state.error} onRetry={favs.reload} /> : null}
      {favs.state.status === "ready" ? (
        favs.state.data.length === 0 ? (
          <Empty>Henüz favori tarifiniz yok.</Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favs.state.data.map((f) => (
              <li key={f.recipeId}>
                {f.available && f.recipe ? (
                  <RecipeCard recipe={f.recipe} />
                ) : (
                  <div className="card text-muted">Bu tarif artık erişilemiyor (yayından kaldırıldı).</div>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
