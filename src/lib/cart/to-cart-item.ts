import type { BookSummary } from "@/types/book";
import type { CartItemInput } from "./cart";

/** Only the fields the cart needs (keeps descriptions etc. out of the browser bundle). */
export function toCartItem(book: BookSummary): CartItemInput {
  return {
    slug: book.slug,
    title: book.title,
    publisher: book.publisher,
    coverUrl: book.coverUrl,
    price: book.price,
    compareAtPrice: book.compareAtPrice,
    maxQuantity: book.stockQuantity,
  };
}
