/** Fields a book card needs. The full database model arrives in Phase 3. */
export type BookSummary = {
  slug: string;
  title: string;
  author: string | null;
  publisher: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  coverUrl: string | null;
};
