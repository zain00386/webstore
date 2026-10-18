import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { biggestDiscounts, booksForExam, categoryCounts, examCounts, newArrivals, relatedBooks, valueOptions } from "./selectors";

const book = (over: Partial<Book>): Book => ({
  id: "1",
  slug: "b",
  title: "Book",
  subtitle: null,
  author: null,
  publisher: "Dogar Publishers",
  edition: null,
  isbn: null,
  description: [],
  categorySlug: "other",
  exams: [],
  price: 500,
  compareAtPrice: null,
  stockQuantity: 10,
  lowStockThreshold: null,
  coverUrl: null,
  images: [],
  isNewArrival: false,
  sortOrder: 1,
  ...over,
});

const books = [
  book({ slug: "a", categorySlug: "css-pms", exams: ["css-pms", "css"], sortOrder: 3, isNewArrival: true, compareAtPrice: 1000 }),
  book({ slug: "b", categorySlug: "css-pms", exams: ["css-pms"], sortOrder: 2, compareAtPrice: 600 }),
  book({ slug: "c", categorySlug: "law", exams: ["law"], sortOrder: 1, isNewArrival: true, publisher: "JWT" }),
];

describe("catalogue selectors", () => {
  it("counts categories and exams", () => {
    expect(categoryCounts(books).get("css-pms")).toBe(2);
    expect(examCounts(books).get("css")).toBe(1);
  });

  it("picks books for an exam, newest first", () => {
    expect(booksForExam(books, "css-pms", 5).map((b) => b.slug)).toEqual(["a", "b"]);
  });

  it("finds related books in the same category, excluding itself", () => {
    expect(relatedBooks(books, books[0]).map((b) => b.slug)).toEqual(["b"]);
  });

  it("lists new arrivals and biggest discounts", () => {
    expect(newArrivals(books, 5).map((b) => b.slug)).toEqual(["a", "c"]);
    expect(biggestDiscounts(books, 5).map((b) => b.slug)).toEqual(["a", "b"]);
  });

  it("builds filter options, most common first", () => {
    expect(valueOptions(books, (b) => b.publisher)).toEqual([
      { value: "Dogar Publishers", count: 2 },
      { value: "JWT", count: 1 },
    ]);
    expect(valueOptions(books, (b) => b.author)).toEqual([]);
  });
});
