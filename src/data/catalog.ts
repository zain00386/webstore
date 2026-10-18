import "server-only";
import rawProducts from "../../data/import/lahore-products.json";
import { categories } from "@/config/categories";
import { deriveExams } from "@/lib/catalog/exams";
import { decodeEntities, htmlToTextBlocks } from "@/lib/catalog/html-text";
import type { Book } from "@/types/book";

/**
 * PHASE 2 DATA SOURCE (temporary).
 * Books come from the Lahore main-branch catalogue snapshot. Titles, prices,
 * covers and descriptions are real; STOCK IS NOT — every book shows as in stock
 * until the owner sets real counts (Phase 6). Replaced by Supabase in Phase 4.
 */
const PREVIEW_STOCK = 10;

type RawProduct = {
  sourceId: number;
  name: string;
  slug: string;
  price: number;
  regularPrice: number;
  categories: string[];
  shortDescription: string | null;
  description: string | null;
  images: string[];
};

/** "... by Dogar Publishers", "... by Dogar & Medicare Books" etc. The publisher is shown separately. */
const PUBLISHER_SUFFIX = /\s+by\s+[^|]*\bDogar\b[^|]*$/i;

function toCategorySlug(sourceCategories: string[]): string {
  for (const name of sourceCategories) {
    const match = categories.find((c) => c.sourceNames.includes(name));
    if (match) return match.slug;
  }
  return "other";
}

function toBook(p: RawProduct): Book | null {
  if (!p.price || p.price <= 0) return null; // can't sell at Rs. 0
  const name = decodeEntities(p.name).trim();
  const [mainTitle, ...rest] = (name.replace(PUBLISHER_SUFFIX, "").trim() || name).split(/\s+\|\s+/);
  const title = mainTitle.trim();
  const subtitle = rest.join(" · ").trim() || null;
  const categorySlug = toCategorySlug(p.categories);
  const description = htmlToTextBlocks(p.shortDescription);
  const longDescription = htmlToTextBlocks(p.description);
  return {
    id: `lahore-${p.sourceId}`,
    slug: p.slug,
    title,
    subtitle,
    author: null,
    publisher: "Dogar Publishers",
    edition: null,
    isbn: null,
    description: description.length >= longDescription.length ? description : longDescription,
    categorySlug,
    exams: deriveExams(name, categorySlug),
    price: p.price,
    compareAtPrice: p.regularPrice > p.price ? p.regularPrice : null,
    stockQuantity: PREVIEW_STOCK,
    coverUrl: p.images[0] ?? null,
    images: p.images,
    isNewArrival: p.categories.some((c) => c.startsWith("New Arrivals")),
    sortOrder: p.sourceId,
  };
}

let cache: Book[] | null = null;

export function getAllBooks(): Book[] {
  cache ??= (rawProducts as RawProduct[]).map(toBook).filter((b): b is Book => b !== null);
  return cache;
}

export function getBookBySlug(slug: string): Book | undefined {
  return getAllBooks().find((b) => b.slug === slug);
}

export function getRelatedBooks(book: Book, limit = 4): Book[] {
  return getAllBooks()
    .filter((b) => b.categorySlug === book.categorySlug && b.slug !== book.slug)
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .slice(0, limit);
}

export function getCategoryCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of getAllBooks()) counts.set(b.categorySlug, (counts.get(b.categorySlug) ?? 0) + 1);
  return counts;
}
