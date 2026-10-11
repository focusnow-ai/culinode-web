import "server-only";
import { cache } from "react";
import { ApiError, serverPublicClient, unwrap, type PublicRecipe } from "./api/client";

/** A single API call for metadata and page within one request (no cross-request cache). */
export const getPublicRecipe = cache(async (id: string): Promise<PublicRecipe | null> => {
  try {
    return await unwrap(serverPublicClient().GET("/v1/public/recipes/{recipeId}", { params: { path: { recipeId: id } } }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
});

export const getPublicChef = cache(async (id: string, continuation?: string) => {
  try {
    return await unwrap(
      serverPublicClient().GET("/v1/public/chefs/{userId}", { params: { path: { userId: id }, query: { limit: 24, continuation } } }),
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function getDiscussions(id: string) {
  try {
    return await unwrap(
      serverPublicClient().GET("/v1/recipes/{recipeId}/discussions", { params: { path: { recipeId: id }, query: { limit: 50 } } }),
    );
  } catch {
    return { items: [], continuation: null };
  }
}

/** schema.org Recipe JSON-LD; built from published content only. */
export function recipeJsonLd(r: PublicRecipe, siteUrl: string, imageUrl: string | null) {
  const iso = (m?: number | null) => (m ? `PT${m}M` : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.description ?? undefined,
    image: imageUrl ? [imageUrl] : undefined,
    author: { "@type": "Person", name: r.author.displayName, url: `${siteUrl}/chef/${encodeURIComponent(r.author.id)}` },
    datePublished: r.publishedAt,
    dateModified: r.updatedAt,
    prepTime: iso(r.prepMinutes),
    cookTime: iso(r.cookMinutes),
    totalTime: iso((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0) || null),
    recipeYield: r.yield?.amount ? `${r.yield.amount} ${r.yield.unit ?? ""}`.trim() : undefined,
    keywords: r.tags.join(", ") || undefined,
    recipeIngredient: r.ingredients.map((i) => {
      const q = i.quantity;
      return [q.amount ?? "", q.unit ?? "", i.name, q.toTaste ? "(to taste)" : ""].filter(Boolean).join(" ");
    }),
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
  };
}
