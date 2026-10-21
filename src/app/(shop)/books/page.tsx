import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchX, X } from "lucide-react";
import { examGroups, getExam, umbrellaExams, type ExamDef } from "@/config/exams";
import { catalogHref, parseCatalogQuery, queryCatalog, type CatalogQuery } from "@/lib/catalog/query";
import { categoryCounts, examCounts as countExams, valueOptions } from "@/lib/catalog/selectors";
import { getCatalogState, type Catalog } from "@/lib/db/catalog";
import { BookGridSkeleton } from "@/components/book/book-card-skeleton";
import { BookGrid } from "@/components/book/shop-book-card";
import { FilterForm } from "@/components/catalog/filter-form";
import { MobileFilters } from "@/components/catalog/mobile-filters";
import { SortSelect } from "@/components/catalog/sort-select";
import { EmptyState } from "@/components/feedback/empty-state";
import { SetupNotice } from "@/components/feedback/setup-notice";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";

const DEFAULT_DESCRIPTION =
  "Browse CSS, PMS, FPSC, PPSC, NTS, MDCAT, ECAT, ISSB, job test, law and academic books. Delivery all over Pakistan.";

/**
 * Exam and single-category pages are useful in Google; searches and
 * multi-filter combinations are not, so those are marked noindex.
 */
export async function generateMetadata({ searchParams }: PageProps<"/books">): Promise<Metadata> {
  const query = parseCatalogQuery(await searchParams);
  const exam = getExam(query.exam);
  const onlyExam = exam && !query.q && query.category.length === 0 && query.page === 1;
  const filtered = Boolean(query.q || query.category.length || query.publisher.length || query.author || query.min || query.max || query.stock || query.sort !== "newest");
  if (onlyExam && !filtered) {
    return {
      title: `${exam.label} books`,
      description: exam.intro ?? DEFAULT_DESCRIPTION,
      alternates: { canonical: `/books?exam=${exam.slug}` },
    };
  }
  return {
    title: query.q ? `Search: ${query.q}` : "All books",
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "/books" },
    robots: filtered || query.page > 1 || exam ? { index: false, follow: true } : undefined,
  };
}

export default function BooksPage({ searchParams }: PageProps<"/books">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Books" }]} />
      {/* searchParams is only known per request, so results stream in behind a skeleton. */}
      <Suspense fallback={<CatalogSkeleton />}>
        {searchParams.then((params) => (
          <CatalogLoader query={parseCatalogQuery(params)} />
        ))}
      </Suspense>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">All books</h1>
      <BookGridSkeleton count={10} />
    </>
  );
}

async function CatalogLoader({ query }: { query: CatalogQuery }) {
  const state = await getCatalogState();
  if (state.status === "not-configured") {
    return (
      <>
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">All books</h1>
        <SetupNotice problems={state.problems} />
      </>
    );
  }
  return <CatalogView catalog={state.catalog} query={query} />;
}

function CatalogView({ catalog, query }: { catalog: Catalog; query: CatalogQuery }) {
  const result = queryCatalog(catalog.books, query);
  const counts = categoryCounts(catalog.books);
  const exCounts = countExams(catalog.books);
  const toOptions = (list: ExamDef[]) =>
    list.filter((e) => exCounts.get(e.slug)).map((e) => ({ value: e.slug, label: e.label, count: exCounts.get(e.slug) }));
  const exams = [
    { title: "Popular", options: toOptions(umbrellaExams) },
    ...examGroups.map((g) => ({ title: g.title, options: toOptions(g.exams) })),
  ].filter((g) => g.options.length > 0);
  const categoryOptions = catalog.categories
    .filter((c) => counts.get(c.slug))
    .map((c) => ({ value: c.slug, label: c.name, count: counts.get(c.slug) }));
  // Only offer publisher choice once there's more than one publisher in stock.
  const publisherOptions = valueOptions(catalog.books, (b) => b.publisher).map((p) => ({ value: p.value, label: p.value, count: p.count }));
  const publishers = publisherOptions.length > 1 ? publisherOptions : [];
  const categoryName = (slug: string) => catalog.categories.find((c) => c.slug === slug)?.name ?? slug;

  const exam = getExam(query.exam);
  const examLabel = exam?.label;
  const singleCategory = query.category.length === 1 ? categoryName(query.category[0]) : undefined;
  const heading = query.q ? `Results for “${query.q}”` : (examLabel ?? singleCategory ?? "All books");

  const chips = [
    ...(query.q ? [{ label: `“${query.q}”`, href: catalogHref(query, { q: undefined, page: 1 }) }] : []),
    ...(examLabel ? [{ label: examLabel, href: catalogHref(query, { exam: undefined, page: 1 }) }] : []),
    ...query.category.map((c) => ({
      label: categoryName(c),
      href: catalogHref(query, { category: query.category.filter((x) => x !== c), page: 1 }),
    })),
    ...query.publisher.map((p) => ({
      label: p,
      href: catalogHref(query, { publisher: query.publisher.filter((x) => x !== p), page: 1 }),
    })),
    ...(query.author ? [{ label: query.author, href: catalogHref(query, { author: undefined, page: 1 }) }] : []),
    ...(query.stock === "in" ? [{ label: "In stock", href: catalogHref(query, { stock: undefined, page: 1 }) }] : []),
    ...(query.min != null || query.max != null
      ? [
          {
            label: `Rs. ${query.min ?? 0} – ${query.max ?? "any"}`,
            href: catalogHref(query, { min: undefined, max: undefined, page: 1 }),
          },
        ]
      : []),
  ];
  const filterKey = catalogHref(query, { page: 1 });
  const filterProps = { query, exams, categories: categoryOptions, publishers };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {result.total} {result.total === 1 ? "book" : "books"}
          </p>
          {exam?.intro && !query.q && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{exam.intro}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MobileFilters key={`m-${filterKey}`} {...filterProps} activeCount={chips.length} />
          <SortSelect key={`s-${filterKey}`} query={query} />
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.href + chip.label}>
              <Link
                href={chip.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-medium hover:bg-muted"
              >
                {chip.label}
                <X className="size-3.5" aria-hidden />
                <span className="sr-only">Remove filter</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/books" className="inline-flex h-8 items-center px-2 text-xs font-medium underline">
              Clear all
            </Link>
          </li>
        </ul>
      )}

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto rounded-2xl bg-surface p-4 ring-1 ring-border">
            <FilterForm key={`d-${filterKey}`} {...filterProps} idPrefix="filter" autoSubmit />
          </div>
        </aside>

        <section aria-labelledby="results-title">
          <h2 id="results-title" className="sr-only">
            Books
          </h2>
          {result.books.length > 0 ? (
            <>
              <BookGrid books={result.books} priorityCount={4} />
              <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(page) => catalogHref(query, { page })} />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No books match your filters"
              description="Try fewer filters or a different search. You can also WhatsApp us on 0324-9574895 and we'll find the book for you."
              action={
                <Button asChild size="pill">
                  <Link href="/books">Clear filters</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}
