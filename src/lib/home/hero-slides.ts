import { umbrellaExams } from "@/config/exams";
import { booksForExam, newArrivals } from "@/lib/catalog/selectors";
import { formatDate } from "@/lib/safe-url";
import type { Book } from "@/types/book";
import type { Post } from "@/types/post";

/** A slide the owner made in Admin > Banner (see src/lib/db/banner.ts). */
export type OwnerSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string | null;
  examTag: string | null;
  button: { label: string; href: string };
  secondary: { label: string; href: string } | null;
};

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** Up to two covers shown on the right (when there is no picture). */
  books: { title: string; coverUrl: string | null }[];
  /** The owner's own picture for this slide, shown instead of covers. */
  imageUrl?: string | null;
};

const cover = (b: Book) => ({ title: b.title, coverUrl: b.coverUrl });

type BannerOptions = {
  /** Slides from Admin > Banner, already in the owner's order. */
  owner?: OwnerSlide[];
  /** Add a slide for each new vacancy post (Admin > Banner switch). */
  autoVacancies?: boolean;
  max?: number;
};

/**
 * Slides for the home page banner.
 *  - With the owner's own slides: those first (in their order), then, if the
 *    switch is on, one slide per new vacancy post.
 *  - Without: built from real data, as before: newest vacancies with their
 *    books, "New arrivals", then popular exams.
 */
export function buildHeroSlides(posts: Post[], books: Book[], options: BannerOptions | number = {}): HeroSlide[] {
  const { owner = [], autoVacancies = true, max = owner.length ? 8 : 4 } = typeof options === "number" ? { max: options } : options;
  const slides: HeroSlide[] = owner.slice(0, max).map((o) => ({
    id: `owner-${o.id}`,
    eyebrow: o.eyebrow,
    title: o.title,
    text: o.body,
    cta: o.button,
    secondary: o.secondary ?? undefined,
    books: o.imageUrl || !o.examTag ? [] : booksForExam(books, o.examTag, 2).map(cover),
    imageUrl: o.imageUrl,
  }));
  const usedExams = new Set<string>(owner.map((o) => o.examTag).filter((e): e is string => Boolean(e)));

  for (const post of autoVacancies ? posts : []) {
    if (slides.length >= (owner.length ? max : max - 1)) break;
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

  // The owner's slides replace the automatic "New arrivals" and exam slides.
  if (owner.length) return slides;

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
