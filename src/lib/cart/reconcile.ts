import { MAX_PER_LINE, type CartLine } from "./cart";

/** What the server currently says about a book (only active books are returned). */
export type ServerBook = {
  id: string;
  slug: string;
  title: string;
  publisher: string | null;
  coverUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
};

export type CartIssue =
  | { kind: "unavailable"; title: string }
  | { kind: "out_of_stock"; title: string }
  | { kind: "reduced"; title: string; from: number; to: number }
  | { kind: "price"; title: string; from: number; to: number };

/**
 * Brings a (possibly old, possibly tampered) browser cart up to date with the
 * server: fresh prices, titles and stock; quantities limited to what's in stock;
 * books that are hidden, deleted or out of stock are flagged and block checkout.
 * Nothing is reserved: stock is only taken when an order is placed.
 */
export function reconcileCart(lines: CartLine[], books: ServerBook[]): { lines: CartLine[]; issues: CartIssue[] } {
  const byId = new Map(books.map((b) => [b.id, b]));
  const bySlug = new Map(books.map((b) => [b.slug, b]));
  const issues: CartIssue[] = [];
  const seen = new Set<string>();
  const out: CartLine[] = [];

  for (const line of lines) {
    const book = (line.bookId && byId.get(line.bookId)) || (!line.bookId ? bySlug.get(line.slug) : undefined);

    if (!book) {
      if (line.status !== "unavailable") issues.push({ kind: "unavailable", title: line.title });
      out.push({ ...line, status: "unavailable", maxQuantity: 0 });
      continue;
    }
    if (seen.has(book.id)) continue; // the same book twice (e.g. old slug + new slug): keep one line
    seen.add(book.id);

    const fresh = {
      bookId: book.id,
      slug: book.slug,
      title: book.title,
      publisher: book.publisher,
      coverUrl: book.coverUrl,
      price: book.price,
      compareAtPrice: book.compareAtPrice,
      maxQuantity: book.stockQuantity,
    };

    if (book.stockQuantity <= 0) {
      if (line.status !== "out_of_stock") issues.push({ kind: "out_of_stock", title: book.title });
      out.push({ ...fresh, quantity: line.quantity, status: "out_of_stock" });
      continue;
    }

    const allowed = Math.min(book.stockQuantity, MAX_PER_LINE);
    const quantity = Math.max(1, Math.min(line.quantity, allowed));
    if (quantity < line.quantity) issues.push({ kind: "reduced", title: book.title, from: line.quantity, to: quantity });
    if (book.price !== line.price && !line.status) issues.push({ kind: "price", title: book.title, from: line.price, to: book.price });
    out.push({ ...fresh, quantity });
  }
  return { lines: out, issues };
}

/** Checkout is blocked while any line can't be bought. */
export function hasBlockingLines(lines: CartLine[]): boolean {
  return lines.some((l) => l.status);
}

/** What the browser sends to the server: just which books, never prices. */
export function cartRefs(lines: CartLine[]): { id?: string; slug: string }[] {
  return lines.map((l) => (l.bookId ? { id: l.bookId, slug: l.slug } : { slug: l.slug }));
}
