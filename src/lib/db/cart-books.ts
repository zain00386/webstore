import "server-only";
import { z } from "zod";
import type { ServerBook } from "@/lib/cart/reconcile";
import { getSupabasePublicConfig } from "@/lib/env";
import type { Db } from "@/lib/supabase/server";
import { BOOK_COVERS_BUCKET, publicImageUrl } from "./book-mapper";
import { DataError } from "./queries";

export const cartRefsSchema = z
  .array(
    z.object({
      id: z.uuid().optional(),
      slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(200),
    }),
  )
  .max(50);

/**
 * Current price/stock for the books in a cart, read fresh from the database
 * (not the cached catalogue). Uses the visitor key: hidden books are invisible,
 * so they come back as "missing" and the cart marks them unavailable.
 */
export async function fetchBooksForCart(db: Db, refs: z.infer<typeof cartRefsSchema>): Promise<ServerBook[]> {
  if (refs.length === 0) return [];
  const config = getSupabasePublicConfig();
  const supabaseUrl = config.ok ? config.value.url : "";
  const ids = [...new Set(refs.map((r) => r.id).filter((x): x is string => Boolean(x)))];
  const slugs = [...new Set(refs.filter((r) => !r.id).map((r) => r.slug))];
  const cols = "id, slug, title, publisher, cover_image_path, price, compare_at_price, stock_quantity";

  const queries = [
    ids.length ? db.from("books").select(cols).eq("is_active", true).in("id", ids) : null,
    slugs.length ? db.from("books").select(cols).eq("is_active", true).in("slug", slugs) : null,
  ].filter(Boolean);
  const results = await Promise.all(queries);
  const books = new Map<string, ServerBook>();
  for (const res of results) {
    if (!res) continue;
    if (res.error) throw new DataError("cart books", res.error);
    for (const b of res.data) {
      books.set(b.id, {
        id: b.id,
        slug: b.slug,
        title: b.title,
        publisher: b.publisher,
        coverUrl: publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, b.cover_image_path),
        price: Number(b.price),
        compareAtPrice: b.compare_at_price == null ? null : Number(b.compare_at_price),
        stockQuantity: b.stock_quantity,
      });
    }
  }
  return [...books.values()];
}
