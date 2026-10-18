/** Fields a book card needs. */
export type BookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  publisher: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  /** "Low stock" shows at or below this count; null = never (no fake scarcity). */
  lowStockThreshold: number | null;
  coverUrl: string | null;
};

/** Full book as the customer pages use it. Mirrors the database model planned for Phase 3. */
export type Book = BookSummary & {
  /** Extra title detail shown on the book page, e.g. "Public Service Commission | New Syllabus". */
  subtitle: string | null;
  edition: string | null;
  isbn: string | null;
  /** Plain-text blocks; lines starting with "• " are list items. */
  description: string[];
  categorySlug: string;
  exams: string[];
  images: string[];
  isNewArrival: boolean;
  /** Higher = added more recently. */
  sortOrder: number;
};
