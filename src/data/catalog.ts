import "server-only";
import rawProducts from "../../data/import/lahore-products.json";
import { categories } from "@/config/categories";
import { mapLahoreProduct, type LahoreProduct } from "@/lib/catalog/lahore-import";
import type { Book } from "@/types/book";

/**
 * PHASE 2 PREVIEW DATA SOURCE (temporary).
 * Books come from the Lahore main-branch catalogue snapshot. Titles, prices,
 * covers and descriptions are real; STOCK IS NOT — every book shows as in stock
 * until the owner sets real counts. Replaced by the Supabase database in Phase 4.
 */
const PREVIEW_STOCK = 10;

export function categorySlugFor(sourceCategories: string[]): string {
  for (const name of sourceCategories) {
    const match = categories.find((c) => c.sourceNames.includes(name));
    if (match) return match.slug;
  }
  return "other";
}

function toBook(p: LahoreProduct): Book | null {
  const b = mapLahoreProduct(p, categorySlugFor);
  if (!b) return null;
  return {
    id: b.sourceRef,
    slug: b.slug,
    title: b.title,
    subtitle: b.subtitle,
    author: null,
    publisher: b.publisher,
    edition: null,
    isbn: null,
    description: b.descriptionBlocks,
    categorySlug: b.categorySlug,
    exams: b.examTags,
    price: b.price,
    compareAtPrice: b.compareAtPrice,
    stockQuantity: PREVIEW_STOCK,
    coverUrl: b.imageUrl,
    images: b.imageUrl ? [b.imageUrl] : [],
    isNewArrival: b.isNewArrival,
    sortOrder: b.sourceId,
  };
}

let cache: Book[] | null = null;

export function getAllBooks(): Book[] {
  cache ??= (rawProducts as LahoreProduct[]).map(toBook).filter((b): b is Book => b !== null);
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
