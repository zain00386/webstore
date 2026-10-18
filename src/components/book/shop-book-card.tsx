import type { BookSummary } from "@/types/book";
import { toCartItem } from "@/lib/cart/to-cart-item";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { BookCard } from "./book-card";

/** Book card with a working Add to cart button. */
export function ShopBookCard({ book, priority }: { book: BookSummary; priority?: boolean }) {
  return <BookCard book={book} priority={priority} action={<AddToCartButton item={toCartItem(book)} />} />;
}

export function BookGrid({ books, priorityCount = 0 }: { books: BookSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {books.map((book, i) => (
        <li key={book.slug}>
          <ShopBookCard book={book} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
