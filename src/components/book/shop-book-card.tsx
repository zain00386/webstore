import type { BookSummary } from "@/types/book";
import { toCartItem } from "@/lib/cart/to-cart-item";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { BookCard } from "./book-card";

/** Book card with a working Add to cart button. */
export function ShopBookCard({ book, priority }: { book: BookSummary; priority?: boolean }) {
  return <BookCard book={book} priority={priority} action={<AddToCartButton item={toCartItem(book)} />} />;
}

/** One row of books: swipe sideways on phones, a 5-column grid on large screens. */
export function BookRow({ books }: { books: BookSummary[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0">
      {books.map((book) => (
        <li key={book.slug} className="w-[44vw] max-w-52 shrink-0 snap-start lg:w-auto lg:max-w-none">
          <ShopBookCard book={book} />
        </li>
      ))}
    </ul>
  );
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
