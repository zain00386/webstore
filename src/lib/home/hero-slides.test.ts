import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import type { Post } from "@/types/post";
import { buildHeroSlides } from "./hero-slides";

const book = (slug: string, exams: string[], extra: Partial<Book> = {}): Book =>
  ({ id: slug, slug, title: slug, author: null, publisher: null, price: 100, compareAtPrice: null, stockQuantity: 5, lowStockThreshold: null, coverUrl: null, subtitle: null, edition: null, isbn: null, description: [], categorySlug: "other", exams, images: [], isNewArrival: false, sortOrder: 1, ...extra }) as Book;

const vacancy = (slug: string, examSlug: string | null): Post => ({
  id: slug,
  slug,
  title: `Vacancy ${slug}`,
  kind: "vacancy",
  excerpt: "",
  body: "",
  coverUrl: null,
  publishedAt: "2026-10-21",
  seoTitle: null,
  seoDescription: null,
  examSlug,
  vacancy: { organisation: "FIA", positions: null, location: null, lastDate: "2026-11-30", applyUrl: null },
});

describe("home banner slides", () => {
  const books = [book("fia-guide", ["jobs"]), book("css-guide", ["css-pms"]), book("new-one", [], { isNewArrival: true })];

  it("puts the newest vacancy with books first, then new arrivals, then exams", () => {
    const slides = buildHeroSlides([vacancy("fia-jobs", "jobs"), vacancy("no-exam", null), vacancy("no-books", "law")], books);
    expect(slides.map((s) => s.id)).toEqual(["post-fia-jobs", "new-arrivals", "exam-css-pms"]);
    expect(slides[0]).toMatchObject({ cta: { href: "/books?exam=jobs" }, secondary: { href: "/blog/fia-jobs" } });
    expect(slides[0].text).toContain("FIA · Last date 30 Nov 2026");
  });

  it("never repeats an exam and stops at the maximum", () => {
    const many = ["css-pms", "jobs", "fpsc-ppsc", "armed-forces", "law"].map((e) => book(`b-${e}`, [e]));
    const slides = buildHeroSlides([vacancy("a", "jobs"), vacancy("b", "jobs")], many, 4);
    expect(slides).toHaveLength(4);
    expect(new Set(slides.map((s) => s.cta.href)).size).toBe(4);
  });

  it("shows nothing when there are no books", () => {
    expect(buildHeroSlides([vacancy("a", "jobs")], [])).toEqual([]);
  });
});
