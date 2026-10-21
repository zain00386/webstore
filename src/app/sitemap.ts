import type { MetadataRoute } from "next";
import { umbrellaExams } from "@/config/exams";
import { getCatalogState } from "@/lib/db/catalog";
import { getPublishedPosts } from "@/lib/db/posts";
import { siteUrl } from "@/lib/site-url";

/** Every public page Google should know about: shop pages, all books on sale and published posts. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  });

  const [state, posts] = await Promise.all([getCatalogState().catch(() => null), getPublishedPosts().catch(() => [])]);
  const books = state?.status === "ready" ? state.catalog.books : [];

  return [
    page("/", 1, "daily"),
    page("/books", 0.9, "daily"),
    page("/exams", 0.7),
    ...umbrellaExams.map((e) => page(`/books?exam=${e.slug}`, 0.7)),
    page("/blog", 0.7, "daily"),
    ...["/about", "/contact", "/shipping", "/returns", "/faq", "/privacy", "/terms"].map((p) => page(p, 0.3, "monthly")),
    ...books.map((b) => page(`/books/${b.slug}`, 0.8)),
    ...posts.map((p) => ({ ...page(`/blog/${p.slug}`, 0.6, "monthly"), lastModified: p.publishedAt })),
  ];
}
