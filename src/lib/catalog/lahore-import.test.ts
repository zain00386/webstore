import { describe, expect, it } from "vitest";
import { lahoreCreatedAt, mapLahoreProduct, toSlug, type LahoreProduct } from "./lahore-import";

const base: LahoreProduct = {
  sourceId: 42,
  name: "Dogar&#8217;s Unique Nurses Recruitment Test Guide | Public Service Commission | New Syllabus",
  slug: "nurses-guide",
  price: 1500,
  regularPrice: 1800,
  categories: ["Job Related Books", "New Arrivals"],
  shortDescription: "<p>For <strong>nurses</strong></p><ul><li>MCQs</li></ul>",
  description: "",
  images: ["https://dogarpublishers.com.pk/wp-content/uploads/a.jpg"],
};
const cat = () => "job-tests";

describe("mapLahoreProduct", () => {
  it("maps title, subtitle, prices, tags and description", () => {
    const b = mapLahoreProduct(base, cat)!;
    expect(b).toMatchObject({
      sourceRef: "lahore:42",
      slug: "nurses-guide",
      title: "Dogar’s Unique Nurses Recruitment Test Guide",
      subtitle: "Public Service Commission · New Syllabus",
      price: 1500,
      compareAtPrice: 1800,
      isNewArrival: true,
      categorySlug: "job-tests",
      descriptionBlocks: ["For nurses", "• MCQs"],
    });
    expect(b.examTags).toEqual(expect.arrayContaining(["jobs", "fpsc-ppsc"]));
  });

  it("strips the 'by Dogar Publishers' suffix", () => {
    expect(mapLahoreProduct({ ...base, name: "ISSB Tests Preparation Guide by Dogar Publishers" }, cat)!.title).toBe(
      "ISSB Tests Preparation Guide",
    );
  });

  it("skips books with no price and drops fake discounts", () => {
    expect(mapLahoreProduct({ ...base, price: 0 }, cat)).toBeNull();
    expect(mapLahoreProduct({ ...base, regularPrice: 1500 }, cat)!.compareAtPrice).toBeNull();
  });

  it("keeps extra photos for the gallery, without duplicates", () => {
    const b = mapLahoreProduct({ ...base, images: ["https://x/a.jpg", "https://x/b.jpg", "https://x/a.jpg"] }, cat)!;
    expect(b.imageUrl).toBe("https://x/a.jpg");
    expect(b.galleryUrls).toEqual(["https://x/b.jpg"]);
  });

  it("repairs invalid slugs and ignores non-https images", () => {
    const b = mapLahoreProduct({ ...base, slug: "Bad Slug!!", images: ["http://x/a.jpg"] }, cat)!;
    expect(b.slug).toBe("bad-slug");
    expect(b.imageUrl).toBeNull();
  });
});

describe("lahoreCreatedAt", () => {
  it("keeps Lahore order and stays in the past", () => {
    expect(lahoreCreatedAt(49400) > lahoreCreatedAt(100)).toBe(true);
    expect(Date.parse(lahoreCreatedAt(60000))).toBeLessThan(Date.parse("2026-10-18"));
  });
});

describe("toSlug", () => {
  it("makes URL-safe slugs", () => {
    expect(toSlug("CSS Guide (2026) — Part I")).toBe("css-guide-2026-part-i");
  });
});
