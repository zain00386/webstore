import "server-only";
import { randomBytes } from "node:crypto";
import type { AdminBookRow } from "@/lib/admin/books-list";
import type { ImageKind } from "@/lib/admin/image-type";
import type { Db } from "@/lib/supabase/server";
import { BOOK_COVERS_BUCKET } from "./book-mapper";
import { DataError } from "./queries";

/**
 * Admin data access. Always called with the signed-in admin's session client,
 * so the database security rules (admins only) apply to every query.
 */

const LIST_COLUMNS =
  "id, slug, title, subtitle, author, publisher, isbn, price, compare_at_price, stock_quantity, low_stock_threshold, cover_image_path, is_active, is_new_arrival, category_id, updated_at";

export async function fetchAdminBookRows(db: Db): Promise<AdminBookRow[]> {
  const rows: AdminBookRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("books").select(LIST_COLUMNS).order("id").range(from, from + 999).returns<AdminBookRow[]>();
    if (error) throw new DataError("books", error);
    rows.push(...data.map((r) => ({ ...r, price: Number(r.price), compare_at_price: r.compare_at_price == null ? null : Number(r.compare_at_price) })));
    if (data.length < 1000) break;
  }
  return rows;
}

export async function fetchAdminBook(db: Db, id: string) {
  const { data, error } = await db.from("books").select("*").eq("id", id).maybeSingle();
  if (error) throw new DataError("book", error);
  return data;
}

export async function fetchAdminCategories(db: Db) {
  const { data, error } = await db.from("categories").select("id, slug, name, sort_order, is_active").order("sort_order").order("name");
  if (error) throw new DataError("categories", error);
  return data;
}

export async function fetchStoreLowStockThreshold(db: Db): Promise<number | null> {
  const { data } = await db.rpc("get_public_settings");
  return data?.[0]?.low_stock_threshold ?? null;
}

/** Stores an uploaded cover under books/<slug>-<random>.<ext>; returns the storage path. */
export async function uploadCover(db: Db, slug: string, bytes: Uint8Array, kind: ImageKind): Promise<string> {
  const path = `books/${slug.slice(0, 80)}-${randomBytes(4).toString("hex")}.${kind.ext}`;
  const { error } = await db.storage.from(BOOK_COVERS_BUCKET).upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new DataError("cover upload", error);
  return path;
}

/** Deletes files from our bucket (full https links to other sites are left alone). */
export async function removeStoredImages(db: Db, paths: (string | null | undefined)[]) {
  const ours = paths.filter((p): p is string => Boolean(p) && !p!.startsWith("https://"));
  if (ours.length) await db.storage.from(BOOK_COVERS_BUCKET).remove(ours);
}
