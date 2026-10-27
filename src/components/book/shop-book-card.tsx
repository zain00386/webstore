import type { BookSummary } from "@/types/book";
import { toCartItem } from "@/lib/cart/to-cart-item";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { BookCard } from "./book-card";

/** Book card with a working Add to cart button. */
export function ShopBookCard({ book, priority }: { book: BookSummary; priority?: boolean }) {
  return <BookCard book={book} priority={priority} action={<AddToCartButton item={toCartItem(book)} className="gap-1 px-3" />} />;
}

/** One row of books: swipe sideways on phones and tablets, a 5-column grid on wide screens. */
export function BookRow({ books }: { books: BookSummary[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:grid xl:grid-cols-5 xl:gap-4 xl:overflow-visible xl:px-0">
      {books.map((book) => (
        <li key={book.slug} className="w-[44vw] max-w-52 shrink-0 snap-start xl:w-auto xl:max-w-none">
          <ShopBookCard book={book} />
        </li>
      ))}
    </ul>
  );
}

/** "sidebar" is for grids that share the row with a filter column, so cards stay wide enough for the buy button. */
export const bookGridClass = {
  full: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5",
  sidebar: "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4",
};

export function BookGrid({ books, priorityCount = 0, layout = "full" }: { books: BookSummary[]; priorityCount?: number; layout?: keyof typeof bookGridClass }) {
  return (
    <ul className={bookGridClass[layout]}>
      {books.map((book, i) => (
        <li key={book.slug}>
          <ShopBookCard book={book} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
