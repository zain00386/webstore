import { describe, expect, it } from "vitest";
import { mapBookRow, publicImageUrl, type BookRowWithCategory } from "./book-mapper";

const URL_BASE = "https://abc.supabase.co";

const row: BookRowWithCategory = {
  id: "b1",
  slug: "pms-guide",
  title: "PMS Guide",
  subtitle: null,
  author: null,
  publisher: "Dogar Publishers",
  edition: null,
  isbn: null,
  description: "Line one\n• MCQs\n\n• Past papers",
  exam_tags: ["css-pms"],
  price: "1800.00" as unknown as number,
  compare_at_price: 2500,
  stock_quantity: 4,
  low_stock_threshold: null,
  cover_image_path: "lahore/pms guide.png",
  is_new_arrival: true,
  created_at: "2026-10-18T10:00:00Z",
  categories: { slug: "css-pms" },
};

describe("publicImageUrl", () => {
  it("builds storage URLs and keeps full URLs", () => {
    expect(publicImageUrl(URL_BASE, "book-covers", "lahore/pms guide.png")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/book-covers/lahore/pms%20guide.png",
    );
    expect(publicImageUrl(URL_BASE, "book-covers", "https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(publicImageUrl(URL_BASE, "book-covers", null)).toBeNull();
  });
});

describe("mapBookRow", () => {
  it("maps a database row to the shop's Book shape", () => {
    const b = mapBookRow(row, URL_BASE);
    expect(b).toMatchObject({
      slug: "pms-guide",
      price: 1800,
      compareAtPrice: 2500,
      stockQuantity: 4,
      categorySlug: "css-pms",
      exams: ["css-pms"],
      description: ["Line one", "• MCQs", "• Past papers"],
      isNewArrival: true,
    });
    expect(b.coverUrl).toContain("/book-covers/lahore/pms%20guide.png");
  });

  it("falls back to 'other' when the category was removed", () => {
    expect(mapBookRow({ ...row, categories: null }, URL_BASE).categorySlug).toBe("other");
  });
});
