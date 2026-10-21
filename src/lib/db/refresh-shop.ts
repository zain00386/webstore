import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "./catalog";
import { POSTS_TAG } from "./posts";

/**
 * Call from a Server Action after any change to books, categories or settings.
 *
 * - updateTag expires the cached catalogue data immediately.
 * - revalidatePath refreshes the already-built shop pages (e.g. a book page that
 *   was saved after its first visit). Without it, production serves ONE stale
 *   copy before rebuilding: tested, a stock change showed late by one visit.
 */
export function refreshShop() {
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

/** Call from a Server Action after a post is saved, published or deleted. */
export function refreshPosts() {
  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
}
