"use server";

import type { ServerBook } from "@/lib/cart/reconcile";
import { cartRefsSchema, fetchBooksForCart } from "@/lib/db/cart-books";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Read-only: current details of the books in a cart. The browser sends only
 * which books (ids/slugs); prices and stock always come from the database.
 */
export async function checkCartBooks(refs: unknown): Promise<{ ok: true; books: ServerBook[] } | { ok: false; error: string }> {
  const parsed = cartRefsSchema.safeParse(refs);
  if (!parsed.success) return { ok: false, error: "Your cart has an invalid item. Remove it and try again." };
  try {
    return { ok: true, books: await fetchBooksForCart(createPublicClient(), parsed.data) };
  } catch {
    return { ok: false, error: "We couldn't check prices and stock right now. Please try again." };
  }
}
