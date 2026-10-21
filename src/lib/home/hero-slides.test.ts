import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { buildHeroSlides } from "./hero-slides";

const book = (slug: string, extra: Partial<Book> = {}): Book =>
  ({ id: slug, slug, title: slug, author: null, publisher: "Dogar Publishers", price: 100, compareAtPrice: null, stockQuantity: 5, lowStockThreshold: null, coverUrl: null, subtitle: null, edition: null, isbn: null, description: [], categorySlug: "other", exams: [], images: [], isNewArrival: false, sortOrder: 1, ...extra }) as Book;

describe("home banner books", () => {
  it("shows the books ticked as New arrival, newest first", () => {
    const books = [book("old-new", { isNewArrival: true, sortOrder: 1 }), book("plain", { sortOrder: 9 }), book("fresh-new", { isNewArrival: true, sortOrder: 5, stockQuantity: 0 })];
    const slides = buildHeroSlides(books);
    expect(slides.map((s) => s.slug)).toEqual(["fresh-new", "old-new"]);
    expect(slides[0].inStock).toBe(false);
  });

  it("falls back to the most recently added books when none are ticked", () => {
    const books = [book("a", { sortOrder: 1 }), book("b", { sortOrder: 3 }), book("c", { sortOrder: 2 })];
    expect(buildHeroSlides(books, 2).map((s) => s.slug)).toEqual(["b", "c"]);
  });

  it("is empty without books", () => {
    expect(buildHeroSlides([])).toEqual([]);
  });
});
