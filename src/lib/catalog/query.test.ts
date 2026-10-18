import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { catalogHref, PAGE_SIZE, parseCatalogQuery, queryCatalog } from "./query";

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
  coverUrl: null,
  images: [],
  isNewArrival: false,
  sortOrder: 1,
  ...over,
});

const books = [
  book({ slug: "pms", title: "PMS Guide", categorySlug: "css-pms", exams: ["css-pms"], price: 1800, compareAtPrice: 2500, sortOrder: 3 }),
  book({ slug: "ecat", title: "ECAT Papers", categorySlug: "entry-tests", exams: ["mdcat-ecat"], price: 1500, sortOrder: 2 }),
  book({ slug: "issb", title: "ISSB Tests", categorySlug: "armed-forces", exams: ["armed-forces"], price: 800, compareAtPrice: 900, sortOrder: 1 }),
];

describe("parseCatalogQuery", () => {
  it("falls back to safe defaults for bad input", () => {
    const q = parseCatalogQuery({ sort: "DROP TABLE", page: "-4", min: "abc", category: "<script>" });
    expect(q.sort).toBe("newest");
    expect(q.page).toBe(1);
    expect(q.min).toBeUndefined();
    expect(q.category).toEqual([]);
  });

  it("reads repeated category params and numbers", () => {
    const q = parseCatalogQuery({ category: ["law", "css-pms"], min: "500", page: "2", q: "  pms " });
    expect(q.category).toEqual(["law", "css-pms"]);
    expect(q.min).toBe(500);
    expect(q.page).toBe(2);
    expect(q.q).toBe("pms");
  });
});

describe("queryCatalog", () => {
  const run = (params: Record<string, string | string[]>) => queryCatalog(books, parseCatalogQuery(params));

  it("searches all words, case-insensitive", () => {
    expect(run({ q: "pms guide" }).books.map((b) => b.slug)).toEqual(["pms"]);
    expect(run({ q: "nothing here" }).total).toBe(0);
  });

  it("filters by category, exam and price range", () => {
    expect(run({ category: ["css-pms", "armed-forces"] }).total).toBe(2);
    expect(run({ exam: "mdcat-ecat" }).books[0].slug).toBe("ecat");
    expect(run({ min: "1000", max: "1600" }).books.map((b) => b.slug)).toEqual(["ecat"]);
  });

  it("sorts", () => {
    expect(run({}).books.map((b) => b.slug)).toEqual(["pms", "ecat", "issb"]);
    expect(run({ sort: "price-asc" }).books[0].slug).toBe("issb");
    expect(run({ sort: "discount" }).books[0].slug).toBe("pms");
  });

  it("paginates and clamps the page number", () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => book({ slug: `b${i}`, sortOrder: i }));
    const page2 = queryCatalog(many, parseCatalogQuery({ page: "2" }));
    expect(page2.books).toHaveLength(5);
    expect(page2.pageCount).toBe(2);
    expect(queryCatalog(many, parseCatalogQuery({ page: "99" })).page).toBe(2);
  });
});

describe("catalogHref", () => {
  it("keeps filters and drops defaults", () => {
    expect(catalogHref({ q: "pms", category: ["law"], sort: "newest", page: 1 }, { page: 2 })).toBe(
      "/books?q=pms&category=law&page=2",
    );
    expect(catalogHref({})).toBe("/books");
  });
});
