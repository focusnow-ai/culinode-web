"use client";

import { use } from "react";
import { RecipeEditor } from "@/components/RecipeEditor";
import { ErrorState, Loading } from "@/components/States";
import { unwrap } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/hooks";

export default function RecipeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { api } = useAuth();
  const isNew = id === "yeni";
  const recipe = useAsync(
    async () => (isNew ? null : await unwrap(api.GET("/v1/recipes/{recipeId}", { params: { path: { recipeId: id } } }))),
    [api, id, isNew],
  );
  if (recipe.state.status === "loading") return <Loading />;
  if (recipe.state.status === "error") return <ErrorState error={recipe.state.error} onRetry={recipe.reload} />;
  if (recipe.state.data?.deleted) return <ErrorState error={new Error("Bu tarif silinmiş.")} />;
  return <RecipeEditor key={recipe.state.data?.id ?? "new"} initial={recipe.state.data} />;
}
