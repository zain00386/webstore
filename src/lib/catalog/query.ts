import { z } from "zod";
import { discountPercent } from "@/lib/format";
import type { Book } from "@/types/book";

export const PAGE_SIZE = 24;

export const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "title", label: "Title A-Z" },
] as const;

export type SortValue = (typeof sortOptions)[number]["value"];

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const list = (v: unknown) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const optionalInt = z.preprocess(
  (v) => (first(v) === "" || first(v) == null ? undefined : first(v)),
  z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
);

/** Validates untrusted URL query values; anything invalid falls back to a safe default. */
export const catalogQuerySchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  category: z.preprocess(list, z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(20).catch([])),
  exam: z.preprocess(first, z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined)),
  min: optionalInt,
  max: optionalInt,
  sort: z.preprocess(
    first,
    z.enum(sortOptions.map((o) => o.value) as [SortValue, ...SortValue[]]).catch("newest"),
  ),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(params: Record<string, string | string[] | undefined>): CatalogQuery {
  return catalogQuerySchema.parse(params);
}

function matchesSearch(book: Book, q: string): boolean {
  const haystack = `${book.title} ${book.subtitle ?? ""} ${book.author ?? ""} ${book.publisher ?? ""} ${book.exams.join(" ")}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

const sorters: Record<SortValue, (a: Book, b: Book) => number> = {
  newest: (a, b) => b.sortOrder - a.sortOrder,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  discount: (a, b) =>
    (discountPercent(b.price, b.compareAtPrice) ?? 0) - (discountPercent(a.price, a.compareAtPrice) ?? 0),
  title: (a, b) => a.title.localeCompare(b.title),
};

export type CatalogResult = {
  books: Book[];
  total: number;
  page: number;
  pageCount: number;
};

/** Filter, sort and paginate. Pure, so it can be unit tested and later mirrored in SQL. */
export function queryCatalog(all: Book[], query: CatalogQuery): CatalogResult {
  const { q, category, exam, min, max, sort } = query;
  const filtered = all.filter(
    (b) =>
      (!q || matchesSearch(b, q)) &&
      (category.length === 0 || category.includes(b.categorySlug)) &&
      (!exam || b.exams.includes(exam)) &&
      (min == null || b.price >= min) &&
      (max == null || b.price <= max),
  );
  const sorted = [...filtered].sort(sorters[sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  return {
    books: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sorted.length,
    page,
    pageCount,
  };
}

/** Builds a /books URL, keeping current filters and overriding some. */
export function catalogHref(query: Partial<CatalogQuery>, overrides: Partial<CatalogQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  for (const c of merged.category ?? []) params.append("category", c);
  if (merged.exam) params.set("exam", merged.exam);
  if (merged.min != null) params.set("min", String(merged.min));
  if (merged.max != null) params.set("max", String(merged.max));
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `/books?${qs}` : "/books";
}
