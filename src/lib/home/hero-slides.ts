import { umbrellaExams } from "@/config/exams";
import { booksForExam, newArrivals } from "@/lib/catalog/selectors";
import { formatDate } from "@/lib/safe-url";
import type { Book } from "@/types/book";
import type { Post } from "@/types/post";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** Up to two covers shown on the right. */
  books: { title: string; coverUrl: string | null }[];
};

const cover = (b: Book) => ({ title: b.title, coverUrl: b.coverUrl });

/**
 * Slides for the home page banner, all built from real data:
 *  1. newest vacancy posts that name an exam with books in the shop,
 *  2. "New arrivals" (books marked new),
 *  3. popular exams, to fill up to `max` slides.
 * A new vacancy post therefore appears at the front automatically.
 */
export function buildHeroSlides(posts: Post[], books: Book[], max = 4): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const usedExams = new Set<string>();

  for (const post of posts) {
    if (slides.length >= max - 1) break;
    if (post.kind !== "vacancy" || !post.examSlug || usedExams.has(post.examSlug)) continue;
    const examBooks = booksForExam(books, post.examSlug, 2);
    if (!examBooks.length) continue;
    usedExams.add(post.examSlug);
    const details = [post.vacancy?.organisation, post.vacancy?.lastDate && `Last date ${formatDate(post.vacancy.lastDate)}`].filter(Boolean).join(" · ");
    slides.push({
      id: `post-${post.slug}`,
      eyebrow: "New vacancy",
      title: post.title,
      text: details ? `${details}. Prepare with the right books.` : "Prepare with the right books.",
      cta: { href: `/books?exam=${post.examSlug}`, label: "Buy books" },
      secondary: { href: `/blog/${post.slug}`, label: "Read the vacancy" },
      books: examBooks.map(cover),
    });
  }

  const fresh = newArrivals(books, 2);
  if (fresh.length && slides.length < max) {
    slides.push({
      id: "new-arrivals",
      eyebrow: "Just in",
      title: "New arrivals",
      text: "The latest books in our Rawalpindi shop, delivered all over Pakistan.",
      cta: { href: "/books?sort=newest", label: "Shop new books" },
      books: fresh.map(cover),
    });
  }

  for (const slug of ["css-pms", "fpsc-ppsc", "armed-forces", "mdcat-ecat", "jobs", "law", "nts-gat"]) {
    if (slides.length >= max) break;
    if (usedExams.has(slug)) continue;
    const exam = umbrellaExams.find((e) => e.slug === slug);
    const examBooks = booksForExam(books, slug, 2);
    if (!exam || !examBooks.length) continue;
    usedExams.add(slug);
    slides.push({
      id: `exam-${slug}`,
      eyebrow: "Exam preparation",
      title: `${exam.label} preparation starts here`,
      text: "Guides, past papers and MCQs from all publishers.",
      cta: { href: `/books?exam=${slug}`, label: "Buy now" },
      books: examBooks.map(cover),
    });
  }
  return slides;
}
