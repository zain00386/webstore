import { describe, expect, it } from "vitest";
import { bookFormFromFormData, bookFormSchema, quickEditSchema, toBookRow, type BookFormValues } from "./book-schema";
import { ADMIN_PAGE_SIZE, adminBooksHref, filterAdminBooks, parseAdminBooksQuery, type AdminBookRow } from "./books-list";

const valid: BookFormValues = {
  title: "  CSS English Essay  ",
  subtitle: "",
  slug: "CSS-English-Essay",
  author: "Hafiz Karim",
  publisher: "JWT",
  edition: "",
  isbn: "978-0-306-40615-7",
  description: "Line one\r\n• MCQs   \r\n",
  categoryId: "",
  examTags: ["css-pms", "css", "css"],
  language: "English",
  price: "1450",
  compareAtPrice: "1750",
  stockQuantity: "12",
  lowStockThreshold: "",
  isActive: true,
  isNewArrival: false,
};

describe("bookFormSchema", () => {
  it("cleans and converts a valid form", () => {
    const d = bookFormSchema.parse(valid);
    expect(d).toMatchObject({
      title: "CSS English Essay",
      subtitle: null,
      slug: "css-english-essay",
      isbn: "9780306406157",
      description: "Line one\n• MCQs",
      categoryId: null,
      price: 1450,
      compareAtPrice: 1750,
      stockQuantity: 12,
      lowStockThreshold: null,
      language: "English",
    });
    expect(toBookRow(d).exam_tags).toEqual(["css-pms", "css"]); // duplicates removed
  });

  const errorsFor = (over: Partial<BookFormValues>) => {
    const r = bookFormSchema.safeParse({ ...valid, ...over });
    return r.success ? {} : r.error.flatten().fieldErrors;
  };

  it("rejects negative, fractional or non-numeric stock", () => {
    expect(errorsFor({ stockQuantity: "-1" }).stockQuantity).toBeDefined();
    expect(errorsFor({ stockQuantity: "2.5" }).stockQuantity).toBeDefined();
    expect(errorsFor({ stockQuantity: "ten" }).stockQuantity).toBeDefined();
    expect(errorsFor({ stockQuantity: "0" }).stockQuantity).toBeUndefined();
  });

  it("rejects bad prices and a 'was' price that isn't higher", () => {
    expect(errorsFor({ price: "-5" }).price).toBeDefined();
    expect(errorsFor({ price: "12.345" }).price).toBeDefined();
    expect(errorsFor({ price: "" }).price).toBeDefined();
    expect(errorsFor({ compareAtPrice: "1450" }).compareAtPrice).toBeDefined();
    expect(errorsFor({ compareAtPrice: "" }).compareAtPrice).toBeUndefined();
  });

  it("rejects bad slugs, ISBN typos, unknown exams and empty titles", () => {
    expect(errorsFor({ slug: "css english!" }).slug).toBeDefined();
    expect(errorsFor({ slug: "css--essay" }).slug).toBeDefined();
    expect(errorsFor({ isbn: "9780306406158" }).isbn).toBeDefined();
    expect(errorsFor({ examTags: ["made-up-exam"] }).examTags).toBeDefined();
    expect(errorsFor({ title: "   " }).title).toBeDefined();
    expect(errorsFor({ categoryId: "not-a-uuid" }).categoryId).toBeDefined();
  });

  it("reads checkboxes and multiple exam tags from a submitted form", () => {
    const fd = new FormData();
    fd.set("title", "X");
    fd.append("examTags", "css");
    fd.append("examTags", "law");
    fd.set("isActive", "on");
    const v = bookFormFromFormData(fd);
    expect(v.examTags).toEqual(["css", "law"]);
    expect(v.isActive).toBe(true);
    expect(v.isNewArrival).toBe(false);
  });
});

describe("quickEditSchema", () => {
  const row = { id: "00000000-0000-4000-8000-000000000001", updatedAt: "2026-10-18T10:00:00.000+00:00", price: 500, stockQuantity: 3, isActive: true, isNewArrival: false };
  it("accepts sensible changes, including prices like 19.99", () => {
    expect(quickEditSchema.safeParse([row]).success).toBe(true);
    for (const price of [19.99, 0.1, 1250.5, 0]) expect(quickEditSchema.safeParse([{ ...row, price }]).success, String(price)).toBe(true);
    expect(quickEditSchema.safeParse([{ ...row, price: 1.234 }]).success).toBe(false);
  });
  it("rejects negative stock, fractional stock, bad ids and huge batches", () => {
    expect(quickEditSchema.safeParse([{ ...row, stockQuantity: -1 }]).success).toBe(false);
    expect(quickEditSchema.safeParse([{ ...row, stockQuantity: 1.5 }]).success).toBe(false);
    expect(quickEditSchema.safeParse([{ ...row, price: -1 }]).success).toBe(false);
    expect(quickEditSchema.safeParse([{ ...row, id: "1; drop table books" }]).success).toBe(false);
    expect(quickEditSchema.safeParse(Array(201).fill(row)).success).toBe(false);
    expect(quickEditSchema.safeParse([]).success).toBe(false);
  });
});

const book = (over: Partial<AdminBookRow>): AdminBookRow => ({
  id: "1",
  slug: "b",
  title: "Book",
  subtitle: null,
  author: null,
  publisher: "Dogar Publishers",
  isbn: null,
  price: 500,
  compare_at_price: null,
  stock_quantity: 10,
  low_stock_threshold: null,
  cover_image_path: null,
  is_active: true,
  category_id: "c1",
  updated_at: "2026-10-18T10:00:00Z",
  is_new_arrival: false,
  ...over,
});

describe("filterAdminBooks", () => {
  const rows = [
    book({ id: "a", title: "PMS Guide", stock_quantity: 0, updated_at: "2026-10-18T12:00:00Z" }),
    book({ id: "b", title: "ECAT Papers", stock_quantity: 2, is_active: false, category_id: null, isbn: "9780306406157" }),
    book({ id: "c", title: "Law Notes", stock_quantity: 40, low_stock_threshold: 50, price: 900 }),
  ];
  const run = (p: Record<string, string>, threshold: number | null = null) =>
    filterAdminBooks(rows, parseAdminBooksQuery(p), threshold).rows.map((r) => r.id);

  it("filters by status, stock and category", () => {
    expect(run({ status: "hidden" })).toEqual(["b"]);
    expect(run({ stock: "out" })).toEqual(["a"]);
    expect(run({ stock: "low" })).toEqual(["c"]); // book's own threshold 50
    expect(run({ stock: "low" }, 3)).toEqual(["b", "c"]); // store threshold 3 for others
    expect(run({ category: "none" })).toEqual(["b"]);
  });

  it("searches title and ISBN, and sorts", () => {
    expect(run({ q: "ecat" })).toEqual(["b"]);
    expect(run({ q: "9780306406157" })).toEqual(["b"]);
    expect(run({})[0]).toBe("a"); // most recently updated first
    expect(run({ sort: "price-desc" })[0]).toBe("c");
    expect(run({ sort: "stock-asc" })[0]).toBe("a");
  });

  it("paginates and survives bad query values", () => {
    const many = Array.from({ length: ADMIN_PAGE_SIZE + 3 }, (_, i) => book({ id: String(i) }));
    expect(filterAdminBooks(many, parseAdminBooksQuery({ page: "2" })).rows).toHaveLength(3);
    expect(parseAdminBooksQuery({ status: "deleted", sort: "x", category: "'; drop", page: "-9" })).toMatchObject({
      status: "all",
      sort: "updated",
      category: undefined,
      page: 1,
    });
  });

  it("builds links that keep filters", () => {
    expect(adminBooksHref({ q: "pms", stock: "out", sort: "updated", page: 1 }, { page: 2 })).toBe("/admin/books?q=pms&stock=out&page=2");
  });
});
