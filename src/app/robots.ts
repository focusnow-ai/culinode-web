import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const isProd = process.env.VERCEL_ENV === "production" || process.env.CULINODE_ALLOW_INDEXING === "true";
  return {
    // Preview/dev environments are not indexed.
    rules: isProd
      ? { userAgent: "*", allow: "/", disallow: ["/notebook", "/account", "/favorites", "/notifications", "/moderation", "/sign-in"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${site}/sitemap.xml`,
  };
}
