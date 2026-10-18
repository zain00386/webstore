import type { BookRow } from "@/lib/supabase/database.types";
import type { Book } from "@/types/book";

export const BOOK_COVERS_BUCKET = "book-covers";

/** Columns the shop pages need (never `search` or admin-only fields). */
export const BOOK_PUBLIC_COLUMNS =
  "id, slug, title, subtitle, author, publisher, edition, isbn, description, exam_tags, price, compare_at_price, stock_quantity, low_stock_threshold, cover_image_path, gallery_paths, is_new_arrival, created_at, categories(slug)" as const;

export type BookRowWithCategory = Pick<
  BookRow,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "author"
  | "publisher"
  | "edition"
  | "isbn"
  | "description"
  | "exam_tags"
  | "price"
  | "compare_at_price"
  | "stock_quantity"
  | "low_stock_threshold"
  | "cover_image_path"
  | "gallery_paths"
  | "is_new_arrival"
  | "created_at"
> & { categories: { slug: string } | null };

/** Turns a storage path ("lahore/abc.jpg") into its public URL; full https URLs pass through. */
export function publicImageUrl(supabaseUrl: string, bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("https://")) return path;
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${clean}`;
}

export function mapBookRow(row: BookRowWithCategory, supabaseUrl: string): Book {
  const cover = publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, row.cover_image_path);
  const gallery = (row.gallery_paths ?? [])
    .map((p) => publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, p))
    .filter((u): u is string => Boolean(u));
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    publisher: row.publisher,
    edition: row.edition,
    isbn: row.isbn,
    description: row.description ? row.description.split("\n").filter((l) => l.trim()) : [],
    categorySlug: row.categories?.slug ?? "other",
    exams: row.exam_tags,
    // PostgREST returns numeric as number, but guard against strings.
    price: Number(row.price),
    compareAtPrice: row.compare_at_price == null ? null : Number(row.compare_at_price),
    stockQuantity: row.stock_quantity,
    coverUrl: cover,
    images: cover ? [cover, ...gallery] : gallery,
    isNewArrival: row.is_new_arrival,
    sortOrder: Date.parse(row.created_at) || 0,
  };
}
