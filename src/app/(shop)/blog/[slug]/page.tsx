import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, CalendarClock, ExternalLink, MapPin, Users } from "lucide-react";
import { booksForExam } from "@/lib/catalog/selectors";
import { getCatalogState } from "@/lib/db/catalog";
import { getPostBySlug, getPublishedPosts } from "@/data/posts";
import { formatDate, safeExternalUrl } from "@/lib/safe-url";
import { PostCard, PostKindBadge } from "@/components/blog/post-card";
import { BookGrid } from "@/components/book/shop-book-card";
import { Alert } from "@/components/feedback/alert";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SectionHeading } from "@/components/layout/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostBlock } from "@/types/post";

export function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = getPostBySlug((await params).slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    // Sample posts must never appear in Google.
    robots: post.isSample ? { index: false } : undefined,
    openGraph: { type: "article", title: post.title, description: post.excerpt, publishedTime: post.publishedAt },
  };
}

function Block({ block }: { block: PostBlock }) {
  if (block.type === "h2") return <h2 className="pt-4 text-xl font-semibold">{block.text}</h2>;
  if (block.type === "ul")
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  return <p>{block.text}</p>;
}

export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  // The slug is URL data: a skeleton shows instantly while the post renders.
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8" role="status">
          <span className="sr-only">Loading post…</span>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <PostDetail params={params} />
    </Suspense>
  );
}

async function PostDetail({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const post = getPostBySlug((await params).slug);
  if (!post) notFound();

  const applyUrl = safeExternalUrl(post.vacancy?.applyUrl);
  const examSlug = post.vacancy?.examSlug;
  const catalogState = examSlug ? await getCatalogState() : null;
  const books = examSlug && catalogState?.status === "ready" ? booksForExam(catalogState.catalog.books, examSlug, 4) : [];
  const more = getPublishedPosts(post.kind)
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Vacancies & blog", href: "/blog" }, { label: post.title }]}
      />
      <article className="mx-auto max-w-3xl">
        <PostKindBadge post={post} />
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>

        {post.isSample && (
          <Alert tone="warning" title="Sample post" className="mt-6">
            This page shows how posts will look. It is not a real announcement.
          </Alert>
        )}

        {post.vacancy && (
          <section aria-label="Vacancy details" className="mt-6 rounded-2xl bg-surface p-5 ring-1 ring-border">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex gap-2.5">
                <Building2 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Organisation</dt>
                  <dd className="font-medium">{post.vacancy.organisation}</dd>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Users className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Positions</dt>
                  <dd className="font-medium">{post.vacancy.positions}</dd>
                </div>
              </div>
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">{post.vacancy.location}</dd>
                </div>
              </div>
              <div className="flex gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <div>
                  <dt className="text-muted-foreground">Last date to apply</dt>
                  <dd className="font-medium">{formatDate(post.vacancy.lastDate)}</dd>
                </div>
              </div>
            </dl>
            {applyUrl && (
              <Button asChild variant="outline" size="pill" className="mt-5">
                <a href={applyUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Apply on the official website <ExternalLink data-icon="inline-end" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            )}
          </section>
        )}

        <div className="mt-8 space-y-4 leading-relaxed text-foreground/85">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      {books.length > 0 && (
        <section aria-labelledby="prep-books" className="mt-14">
          <SectionHeading
            id="prep-books"
            title="Books to prepare"
            action={
              <Link href={`/books?exam=${examSlug}`} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
                View all <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
          />
          <BookGrid books={books} />
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-posts" className="mt-14">
          <SectionHeading id="more-posts" title={post.kind === "vacancy" ? "More vacancies" : "More articles"} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
