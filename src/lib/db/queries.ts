import "server-only";
import type { Db } from "@/lib/supabase/server";
import type { Book } from "@/types/book";
import type { PublicSettings } from "@/lib/supabase/database.types";
import { BOOK_PUBLIC_COLUMNS, mapBookRow, type BookRowWithCategory } from "./book-mapper";

/**
 * Typed read helpers for the shop. Each takes a client so callers choose the
 * access level (normally createPublicClient(), which RLS limits to public data).
 * Phase 4 adds filtering/sorting/pagination in SQL and connects the pages.
 */

export class DataError extends Error {
  constructor(what: string, cause: { message: string }) {
    super(`Could not load ${what}: ${cause.message}`);
    this.name = "DataError";
  }
}

export async function fetchActiveBooks(db: Db, supabaseUrl: string, limit = 1000): Promise<Book[]> {
  const { data, error } = await db
    .from("books")
    .select(BOOK_PUBLIC_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<BookRowWithCategory[]>();
  if (error) throw new DataError("books", error);
  return data.map((row) => mapBookRow(row, supabaseUrl));
}

export async function fetchBookBySlug(db: Db, supabaseUrl: string, slug: string): Promise<Book | null> {
  const { data, error } = await db
    .from("books")
    .select(BOOK_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()
    .returns<BookRowWithCategory | null>();
  if (error) throw new DataError("book", error);
  return data ? mapBookRow(data, supabaseUrl) : null;
}

export async function fetchCategories(db: Db) {
  const { data, error } = await db
    .from("categories")
    .select("id, slug, name, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new DataError("categories", error);
  return data;
}

export async function fetchPublicSettings(db: Db): Promise<PublicSettings> {
  const { data, error } = await db.rpc("get_public_settings");
  if (error) throw new DataError("store settings", error);
  const settings = data?.[0];
  if (!settings) throw new DataError("store settings", { message: "settings row is missing" });
  return settings;
}
