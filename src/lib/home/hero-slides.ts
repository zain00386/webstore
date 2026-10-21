import { newArrivals } from "@/lib/catalog/selectors";
import type { Book } from "@/types/book";

/** One book in the home page banner. */
export type HeroSlide = {
  id: string;
  slug: string;
  title: string;
  publisher: string | null;
  edition: string | null;
  price: number;
  compareAtPrice: number | null;
  coverUrl: string | null;
  inStock: boolean;
};

/**
 * Books for the home page banner: the ones ticked "New arrival" in
 * Admin > Books (newest first). If none are ticked, the most recently added
 * books are shown instead, so the banner is never empty while the shop has books.
 */
export function buildHeroSlides(books: Book[], max = 8): HeroSlide[] {
  const picked = newArrivals(books, max);
  const list = picked.length ? picked : [...books].sort((a, b) => b.sortOrder - a.sortOrder).slice(0, max);
  return list.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    publisher: b.publisher,
    edition: b.edition,
    price: b.price,
    compareAtPrice: b.compareAtPrice,
    coverUrl: b.coverUrl,
    inStock: b.stockQuantity > 0,
  }));
}
