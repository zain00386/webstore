import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Search engines may read the shop, but not private or per-visitor pages. */
export default function robots(): MetadataRoute.Robots {
  const live = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
  return {
    // Preview copies of the site (Vercel preview deployments) are hidden from search engines.
    rules: live
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/cart", "/checkout", "/order-confirmation", "/orders", "/_next/data"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
