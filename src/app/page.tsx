import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, MapPin, MessageCircle, Phone, Truck } from "lucide-react";
import { deliveryOptions, examShortcuts, siteConfig } from "@/config/site";
import { sampleBooks, SAMPLE_LOW_STOCK_THRESHOLD } from "@/data/sample-books";
import { formatPKR, whatsappLink } from "@/lib/format";
import { getStockStatus } from "@/lib/stock";
import { BookCard } from "@/components/book/book-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { OpenStatus } from "@/components/store/open-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
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
              Browse books <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="rounded-3xl bg-surface p-6 ring-1 ring-border">
          <h2 className="mb-4 text-sm font-semibold">Visit or order</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>{siteConfig.address}</span>
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
                {deliveryOptions.map((o) => `${o.label} ${formatPKR(o.charge)}`).join(" · ")}
                <br />
                <span className="text-muted-foreground">Cash on Delivery with TCS / Leopards</span>
              </span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={`tel:+${siteConfig.phoneE164}`}>
                <Phone aria-hidden /> {siteConfig.phoneDisplay}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={whatsappLink(siteConfig.phoneE164)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Exam shortcuts */}
      <section aria-labelledby="exams-title">
        <h2 id="exams-title" className="sr-only">
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
        </ul>
      </section>

      {/* Popular books (preview data) */}
      <section aria-labelledby="popular-title">
        <SectionHeading
          id="popular-title"
          eyebrow="Rawalpindi branch"
          title="Popular test prep"
          description="Preview: real Dogar titles; stock shown here is sample data until the catalogue goes live."
          action={
            <Link href="/books" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
              View all books <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sampleBooks.map((book) => {
            const soldOut = getStockStatus(book.stockQuantity) === "out_of_stock";
            return (
              <li key={book.slug}>
                <BookCard
                  book={book}
                  lowStockThreshold={SAMPLE_LOW_STOCK_THRESHOLD}
                  action={
                    <Button className="w-full" variant={soldOut ? "secondary" : "default"} disabled>
                      {soldOut ? "Out of stock" : "Ordering soon"}
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Sections built in later phases */}
      <section aria-labelledby="vacancies-title" className="rounded-3xl bg-surface p-6 ring-1 ring-border">
        <SectionHeading
          id="vacancies-title"
          eyebrow="Updated daily"
          title="Latest job vacancies"
          description="FPSC, PPSC, police, armed forces and more, with the books to prepare. Coming soon."
        />
        <Button asChild variant="outline">
          <Link href="/blog">Go to vacancies</Link>
        </Button>
      </section>
    </div>
  );
}
