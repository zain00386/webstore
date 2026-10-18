import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { productJsonLd } from "./product-json-ld";

const book: Book = {
  id: "1",
  slug: "pms-guide",
  title: "PMS Guide",
  subtitle: null,
  author: null,
  publisher: "Dogar Publishers",
  edition: null,
  isbn: null,
  description: ["Guide </script><script>alert(1)</script>", "• MCQs"],
  categorySlug: "css-pms",
  exams: [],
  price: 1800,
  compareAtPrice: 2500,
  stockQuantity: 0,
  lowStockThreshold: null,
  coverUrl: null,
  images: [],
  isNewArrival: false,
  sortOrder: 0,
};

describe("productJsonLd", () => {
  it("uses only real fields and the true availability", () => {
    const ld = productJsonLd(book, "CSS / PMS / PCS");
    expect(ld.offers).toMatchObject({ priceCurrency: "PKR", price: "1800.00", availability: "https://schema.org/OutOfStock" });
    expect(ld).not.toHaveProperty("aggregateRating");
    expect(ld).not.toHaveProperty("review");
    expect(ld).not.toHaveProperty("author");
    expect(ld).not.toHaveProperty("image");
  });

  it("can be embedded safely once '<' is escaped", () => {
    const html = JSON.stringify(productJsonLd(book)).replace(/</g, "\\u003c");
    expect(html).not.toContain("</script>");
  });
});
