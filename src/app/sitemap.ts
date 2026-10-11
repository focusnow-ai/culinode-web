import type { MetadataRoute } from "next";
import { serverPublicClient, unwrap } from "@/lib/api/client";

export const dynamic = "force-dynamic";

/** Published recipes only; paged and bounded (at most 10 pages × 50). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [{ url: `${site}/`, changeFrequency: "daily", priority: 1 }];
  let continuation: string | undefined;
  try {
    for (let i = 0; i < 10; i++) {
      const page = await unwrap(serverPublicClient().GET("/v1/public/recipes", { params: { query: { limit: 50, continuation } } }));
      for (const r of page.items) entries.push({ url: `${site}/recipe/${r.id}`, lastModified: r.publishedAt });
      if (!page.continuation) break;
      continuation = page.continuation;
    }
  } catch {
    // Only the home page if the API is unreachable
  }
  return entries;
}
