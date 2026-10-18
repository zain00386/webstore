import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabasePublicConfig, type ConfigProblem } from "@/lib/env";
import type { CategoryRow, PublicSettings } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";
import type { Book } from "@/types/book";
import { BOOK_PUBLIC_COLUMNS, mapBookRow, type BookRowWithCategory } from "./book-mapper";
import { DataError, fetchPublicSettings } from "./queries";

/** Invalidate with updateTag/revalidateTag(CATALOG_TAG) after book, stock or settings changes. */
export const CATALOG_TAG = "catalog";

export type Catalog = {
  books: Book[];
  categories: Pick<CategoryRow, "slug" | "name" | "sort_order">[];
  settings: PublicSettings;
};

const PAGE = 1000; // PostgREST returns at most 1000 rows per request.

/**
 * All active books, categories and public settings, cached for about a minute
 * and refreshed immediately when tagged data changes. Uses the visitor (anon)
 * key, so database security rules guarantee only public data is loaded.
 */
export async function loadCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const config = getSupabasePublicConfig();
  if (!config.ok) throw new DataError("catalogue", { message: "Supabase is not configured" });
  const db = createPublicClient();

  const [settings, categoriesRes] = await Promise.all([
    fetchPublicSettings(db),
    db.from("categories").select("slug, name, sort_order").eq("is_active", true).order("sort_order"),
  ]);
  if (categoriesRes.error) throw new DataError("categories", categoriesRes.error);

  const rows: BookRowWithCategory[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("books")
      .select(BOOK_PUBLIC_COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE - 1)
      .returns<BookRowWithCategory[]>();
    if (error) throw new DataError("books", error);
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return {
    books: rows.map((row) => mapBookRow(row, config.value.url, settings.low_stock_threshold)),
    categories: categoriesRes.data,
    settings,
  };
}

export type CatalogState = { status: "ready"; catalog: Catalog } | { status: "not-configured"; problems: ConfigProblem[] };

/** Pages call this: it reports missing setup clearly instead of showing fake data. */
export async function getCatalogState(): Promise<CatalogState> {
  const config = getSupabasePublicConfig();
  if (!config.ok) return { status: "not-configured", problems: config.problems };
  return { status: "ready", catalog: await loadCatalog() };
}
