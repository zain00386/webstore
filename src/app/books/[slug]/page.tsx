import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { BookGallery } from "@/components/book/book-gallery";
import { ShareButton } from "@/components/book/share-button";
import { getCategory } from "@/config/categories";
import { allExams } from "@/config/exams";
import { deliveryOptions, siteConfig } from "@/config/site";
import { getAllBooks, getBookBySlug, getRelatedBooks } from "@/data/catalog";
import { toCartItem } from "@/lib/cart/to-cart-item";
import { formatPKR } from "@/lib/format";
import { getStockStatus } from "@/lib/stock";
import { Description } from "@/components/book/description";
import { Price } from "@/components/book/price";
import { PurchasePanel } from "@/components/book/purchase-panel";
import { BookGrid } from "@/components/book/shop-book-card";
import { StockBadge } from "@/components/book/stock-badge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SectionHeading } from "@/components/layout/section-heading";
import { Skeleton } from "@/components/ui/skeleton";

/** All current books are prerendered at build time, so these pages load instantly. */
export function generateStaticParams() {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/books/[slug]">): Promise<Metadata> {
  const book = getBookBySlug((await params).slug);
  if (!book) return { title: "Book not found" };
  const description = book.description[0]?.slice(0, 160) ?? `${book.title}, ${formatPKR(book.price)}.`;
  return {
    title: book.title,
    description,
    alternates: { canonical: `/books/${book.slug}` },
    openGraph: { title: book.title, description, images: book.coverUrl ? [book.coverUrl] : undefined },
  };
}

export default function BookPage({ params }: PageProps<"/books/[slug]">) {
  // The slug is URL data: a skeleton shows instantly while the book renders.
  return (
    <Suspense fallback={<BookDetailSkeleton />}>
      <BookDetail params={params} />
    </Suspense>
  );
}

function BookDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8" role="status">
      <span className="sr-only">Loading book…</span>
      <Skeleton className="mb-5 h-4 w-64" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <Skeleton className="aspect-[3/4] w-full rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-11 w-full max-w-md rounded-full" />
          <Skeleton className="h-11 w-full max-w-md rounded-full" />
        </div>
      </div>
    </div>
  );
}

async function BookDetail({ params }: { params: PageProps<"/books/[slug]">["params"] }) {
  const book = getBookBySlug((await params).slug);
  if (!book) notFound();

  const category = getCategory(book.categorySlug);
  const status = getStockStatus(book.stockQuantity);
  const related = getRelatedBooks(book);
  // Most specific exams first (e.g. "ISSB" before "ISSB & Armed Forces"), max 5 chips.
  const exams = [...allExams].reverse().filter((e) => book.exams.includes(e.slug)).slice(0, 5);
  const details = [
    ["Publisher", book.publisher],
    ["Author", book.author],
    ["Edition", book.edition],
    ["ISBN", book.isbn],
    ["Category", category?.name],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Books", href: "/books" },
          ...(category ? [{ label: category.name, href: `/books?category=${category.slug}` }] : []),
          { label: book.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
        <BookGallery images={book.images} title={book.title} />

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <StockBadge status={status} />
            {exams.map((e) => (
              <Link
                key={e.slug}
                href={`/books?exam=${e.slug}`}
                className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium hover:bg-muted"
              >
                {e.label}
              </Link>
            ))}
          </div>
          <div>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">{book.title}</h1>
            {book.subtitle && <p className="mt-2 text-sm leading-relaxed">{book.subtitle}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {book.publisher && <p className="text-sm text-muted-foreground">{book.publisher}</p>}
              <ShareButton title={book.title} path={`/books/${book.slug}`} />
            </div>
          </div>
          <Price price={book.price} compareAt={book.compareAtPrice} size="lg" />

          <div className="max-w-md">
            <PurchasePanel item={toCartItem(book)} phoneE164={siteConfig.phoneE164} />
          </div>

          <section aria-labelledby="delivery-returns" className="max-w-md rounded-2xl bg-surface p-4 text-sm ring-1 ring-border">
            <h2 id="delivery-returns" className="mb-3 font-semibold">
              Delivery & returns
            </h2>
            <ul className="space-y-2.5">
              {deliveryOptions.map((o) => (
                <li key={o.id} className="flex gap-2.5">
                  <Truck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="font-medium">
                      {o.label}: {formatPKR(o.charge)}
                    </span>
                    <span className="block text-muted-foreground">{o.note}</span>
                  </span>
                </li>
              ))}
              <li className="flex gap-2.5">
                <RotateCcw className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  Wrong or damaged book? Tell us within 5 business days.{" "}
                  <Link href="/returns" className="underline">
                    Returns policy
                  </Link>
                </span>
              </li>
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>Genuine book from the official Dogar Publishers branch</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="about-book">
          <h2 id="about-book" className="mb-4 text-xl font-semibold">
            About this book
          </h2>
          {book.description.length > 0 ? (
            <Description blocks={book.description} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No description yet. WhatsApp us on {siteConfig.phoneDisplay} for details about this book.
            </p>
          )}
        </section>
        <section aria-labelledby="book-details" className="h-fit rounded-2xl bg-surface p-5 ring-1 ring-border">
          <h2 id="book-details" className="mb-3 text-base font-semibold">
            Details
          </h2>
          <dl className="divide-y divide-border text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-14">
          <SectionHeading id="related" title="You may also like" />
          <BookGrid books={related} />
        </section>
      )}
    </div>
  );
}
