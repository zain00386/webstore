import { z } from "zod";

/** One row in the admin books table (no long description). */
export type AdminBookRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  publisher: string | null;
  isbn: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  cover_image_path: string | null;
  is_active: boolean;
  category_id: string | null;
  updated_at: string;
};

export const ADMIN_PAGE_SIZE = 50;

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const adminBooksQuerySchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional().catch(undefined)),
  category: z.preprocess(first, z.union([z.uuid(), z.literal("none")]).optional().catch(undefined)),
  status: z.preprocess(first, z.enum(["all", "active", "hidden"]).catch("all")),
  stock: z.preprocess(first, z.enum(["all", "in", "low", "out"]).catch("all")),
  sort: z.preprocess(first, z.enum(["updated", "title", "price-asc", "price-desc", "stock-asc", "stock-desc"]).catch("updated")),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(1000).catch(1)),
});

export type AdminBooksQuery = z.infer<typeof adminBooksQuerySchema>;

export function parseAdminBooksQuery(params: Record<string, string | string[] | undefined>): AdminBooksQuery {
  return adminBooksQuerySchema.parse(params);
}

function isLow(b: AdminBookRow, storeThreshold: number | null) {
  const t = b.low_stock_threshold ?? storeThreshold;
  return t != null && t > 0 && b.stock_quantity > 0 && b.stock_quantity <= t;
}

const sorters: Record<AdminBooksQuery["sort"], (a: AdminBookRow, b: AdminBookRow) => number> = {
  updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
  title: (a, b) => a.title.localeCompare(b.title),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "stock-asc": (a, b) => a.stock_quantity - b.stock_quantity,
  "stock-desc": (a, b) => b.stock_quantity - a.stock_quantity,
};

/** Search, filter, sort and paginate the admin book list (pure; unit tested). */
export function filterAdminBooks(rows: AdminBookRow[], query: AdminBooksQuery, storeThreshold: number | null = null) {
  const words = (query.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = rows.filter((b) => {
    if (query.status === "active" && !b.is_active) return false;
    if (query.status === "hidden" && b.is_active) return false;
    if (query.category === "none" && b.category_id) return false;
    if (query.category && query.category !== "none" && b.category_id !== query.category) return false;
    if (query.stock === "out" && b.stock_quantity > 0) return false;
    if (query.stock === "in" && b.stock_quantity <= 0) return false;
    if (query.stock === "low" && !isLow(b, storeThreshold)) return false;
    if (words.length) {
      const hay = `${b.title} ${b.subtitle ?? ""} ${b.author ?? ""} ${b.publisher ?? ""} ${b.isbn ?? ""} ${b.slug}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort(sorters[query.sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / ADMIN_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  return {
    rows: sorted.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE),
    total: sorted.length,
    page,
    pageCount,
  };
}

export function adminBooksHref(query: Partial<AdminBooksQuery>, overrides: Partial<AdminBooksQuery> = {}): string {
  const m = { ...query, ...overrides };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.category) p.set("category", m.category);
  if (m.status && m.status !== "all") p.set("status", m.status);
  if (m.stock && m.stock !== "all") p.set("stock", m.stock);
  if (m.sort && m.sort !== "updated") p.set("sort", m.sort);
  if (m.page && m.page > 1) p.set("page", String(m.page));
  const qs = p.toString();
  return qs ? `/admin/books?${qs}` : "/admin/books";
}
