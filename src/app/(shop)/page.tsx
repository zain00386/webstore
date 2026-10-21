import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, MapPin, MessageCircle, Phone, Truck } from "lucide-react";
import { categories } from "@/config/categories";
import { examShortcuts, siteConfig } from "@/config/site";
import { getStoreInfo } from "@/lib/db/store-info";
import { deliveryLine, telHref } from "@/lib/store-info";
import { umbrellaExams, type ExamDef } from "@/config/exams";
import { getPublishedPosts } from "@/lib/db/posts";
import { biggestDiscounts, booksForExam, categoryCounts, examCounts, newArrivals } from "@/lib/catalog/selectors";
import { getCatalogState } from "@/lib/db/catalog";
import { whatsappLink } from "@/lib/format";
import { SetupNotice } from "@/components/feedback/setup-notice";
import { PostCard } from "@/components/blog/post-card";
import { BookGrid, BookRow } from "@/components/book/shop-book-card";
import { TrustRow } from "@/components/store/trust-row";
import { SectionHeading } from "@/components/layout/section-heading";
import { OpenStatus } from "@/components/store/open-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
      {label} <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export default async function HomePage() {
  const state = await getCatalogState();
  const store = await getStoreInfo();
  const books = state.status === "ready" ? state.catalog.books : [];
  const newBooks = newArrivals(books, 10);
  const onSale = biggestDiscounts(books, 10);
  const counts = categoryCounts(books);
  const shownCategories = categories.filter((c) => c.slug !== "other" && counts.get(c.slug));
  const latestPosts = (await getPublishedPosts()).slice(0, 3);
  const exCounts = examCounts(books);
  // Rows of books per popular exam (only exams that have books).
  const examRows = ["css-pms", "mdcat-ecat", "jobs", "armed-forces", "law"]
    .map((slug) => umbrellaExams.find((e) => e.slug === slug))
    .filter((e): e is ExamDef => Boolean(e && exCounts.get(e.slug)))
    .map((exam) => ({ exam, books: booksForExam(books, exam.slug, 5) }));

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 lg:px-8">
      {/* Hero */}
      <section aria-labelledby="hero-title" className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              <BadgeCheck aria-hidden /> Official Dogar Publishers branch
            </Badge>
            <OpenStatus />
          </div>
          <h1 id="hero-title" className="text-4xl leading-tight font-light tracking-tight sm:text-5xl">
            Prepare smarter.
            <br />
            <span className="font-semibold">Every book, every exam.</span>
          </h1>
          <p className="max-w-lg text-muted-foreground">
            Books from all publishers, from our Rawalpindi shop to your door, anywhere in Pakistan.
          </p>
          <Button asChild size="pill">
            <Link href="/books">
              Browse {books.length > 0 ? `${books.length} books` : "books"} <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
          <h2 className="mb-4 text-sm font-semibold">Visit or order</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>{store.address}</span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>
                Shop: {siteConfig.hours.summary}
                <br />
                <span className="text-muted-foreground">Online orders accepted every day</span>
              </span>
            </li>
            <li className="flex gap-3">
              <Truck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>
                {deliveryLine(store)}
                {store.codAvailable && (
                  <>
                    <br />
                    <span className="text-muted-foreground">
                      Cash on Delivery with {store.delivery.find((o) => o.codAllowed)?.label}
                    </span>
                  </>
                )}
              </span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={telHref(store)}>
                <Phone aria-hidden /> {store.phoneDisplay}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={whatsappLink(store.phoneE164)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Exam shortcuts */}
      <section aria-labelledby="exams-title">
        <h2 id="exams-title" className="mb-3 text-sm font-semibold text-muted-foreground">
          Shop by exam
        </h2>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-wrap lg:px-0">
          {examShortcuts.map((exam) => (
            <li key={exam.slug} className="shrink-0">
              <Link
                href={`/books?exam=${exam.slug}`}
                className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium hover:bg-muted"
              >
                {exam.label}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <Link
              href="/exams"
              className="inline-flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              All exams <ArrowRight className="size-4" aria-hidden />
            </Link>
          </li>
        </ul>
      </section>

      <TrustRow />

      {state.status === "not-configured" && <SetupNotice problems={state.problems} />}

      {newBooks.length > 0 && (
        <section aria-labelledby="new-title">
          <SectionHeading id="new-title" eyebrow="Just in" title="New arrivals" action={<ViewAll href="/books" />} />
          <BookGrid books={newBooks} priorityCount={2} />
        </section>
      )}

      {latestPosts.length > 0 && (
        <section aria-labelledby="vacancies-title" className="rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-6">
          <SectionHeading
            id="vacancies-title"
            eyebrow="Latest"
            title="Job vacancies & guides"
            description="Government and private jobs, with the books to prepare for each test."
            action={<ViewAll href="/blog" label="See all" />}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestPosts.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {examRows.map(({ exam, books: rowBooks }) => (
        <section key={exam.slug} aria-labelledby={`row-${exam.slug}`}>
          <SectionHeading
            id={`row-${exam.slug}`}
            title={exam.label}
            description={`${exCounts.get(exam.slug)} books`}
            action={<ViewAll href={`/books?exam=${exam.slug}`} />}
          />
          <BookRow books={rowBooks} />
        </section>
      ))}

      <section aria-labelledby="categories-title">
        <SectionHeading id="categories-title" title="Shop by category" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shownCategories.map(({ slug, name, icon: Icon }) => (
            <li key={slug}>
              <Link
                href={`/books?category=${slug}`}
                className="flex h-full items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-snug font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{counts.get(slug)} books</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {onSale.length > 0 && (
        <section aria-labelledby="sale-title">
          <SectionHeading
            id="sale-title"
            eyebrow="Save more"
            title="Discounted books"
            action={<ViewAll href="/books?sort=discount" />}
          />
          <BookGrid books={onSale} />
        </section>
      )}
    </div>
  );
}
