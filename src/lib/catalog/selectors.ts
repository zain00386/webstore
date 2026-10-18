import { discountPercent } from "@/lib/format";
import type { Book } from "@/types/book";

/** Pure helpers that work on the loaded catalogue (unit tested). */

export function countBy<T>(items: T[], keys: (item: T) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) for (const k of keys(item)) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
}

export const categoryCounts = (books: Book[]) => countBy(books, (b) => [b.categorySlug]);
export const examCounts = (books: Book[]) => countBy(books, (b) => b.exams);

const newestFirst = (a: Book, b: Book) => b.sortOrder - a.sortOrder;

export function booksForExam(books: Book[], examSlug: string, limit: number): Book[] {
  return books.filter((b) => b.exams.includes(examSlug)).sort(newestFirst).slice(0, limit);
}

export function relatedBooks(books: Book[], book: Book, limit = 4): Book[] {
  return books
    .filter((b) => b.categorySlug === book.categorySlug && b.slug !== book.slug)
    .sort(newestFirst)
    .slice(0, limit);
}

export function newArrivals(books: Book[], limit: number): Book[] {
  return books.filter((b) => b.isNewArrival).sort(newestFirst).slice(0, limit);
}

export function biggestDiscounts(books: Book[], limit: number): Book[] {
  return books
    .filter((b) => discountPercent(b.price, b.compareAtPrice))
    .sort((a, b) => (discountPercent(b.price, b.compareAtPrice) ?? 0) - (discountPercent(a.price, a.compareAtPrice) ?? 0))
    .slice(0, limit);
}

/** Distinct non-empty values with counts, most common first (for publisher/author filters). */
export function valueOptions(books: Book[], pick: (b: Book) => string | null): { value: string; count: number }[] {
  return [...countBy(books, (b) => (pick(b) ? [pick(b)!] : [])).entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
