import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getPublishedPosts } from "@/lib/db/posts";
import { PostCard } from "@/components/blog/post-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Pagination } from "@/components/layout/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Job vacancies & blog",
  description: "Latest government and private job vacancies in Pakistan, with the books to prepare, plus study guides.",
  alternates: { canonical: "/blog" },
};

const PER_PAGE = 12;

const tabs = [
  { value: undefined, label: "All" },
  { value: "vacancy", label: "Vacancies" },
  { value: "blog", label: "Blog" },
] as const;

const hrefFor = (kind: "vacancy" | "blog" | undefined, page = 1) => {
  const sp = new URLSearchParams();
  if (kind) sp.set("type", kind);
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return s ? `/blog?${s}` : "/blog";
};

export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Vacancies & blog" }]} />
      <h1 className="text-3xl font-semibold tracking-tight">Job vacancies & blog</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        New vacancies and study guides, with the books to prepare for each test.
      </p>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
        {searchParams.then((p) => {
          const raw = Array.isArray(p.type) ? p.type[0] : p.type;
          const kind = raw === "vacancy" || raw === "blog" ? raw : undefined;
          const page = Math.max(1, Math.floor(Number(Array.isArray(p.page) ? p.page[0] : p.page) || 1));
          return <PostList kind={kind} page={page} />;
        })}
      </Suspense>
    </div>
  );
}

async function PostList({ kind, page }: { kind?: "vacancy" | "blog"; page: number }) {
  const all = await getPublishedPosts(kind);
  const pageCount = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const posts = all.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  return (
    <>
      <nav aria-label="Post type" className="mb-6 flex gap-2">
        {tabs.map((t) => {
          const active = t.value === kind;
          return (
            <Link
              key={t.label}
              href={hrefFor(t.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-full px-4 text-sm font-medium ring-1 ring-border transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:h-10",
                active && "bg-primary text-primary-foreground ring-primary hover:bg-primary",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <h2 className="sr-only">{kind === "vacancy" ? "Vacancies" : kind === "blog" ? "Articles" : "Posts"}</h2>
      {posts.length > 0 ? (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          <Pagination page={current} pageCount={pageCount} hrefFor={(n) => hrefFor(kind, n)} />
        </>
      ) : (
        <EmptyState icon={Newspaper} title="No posts yet" description="Check back soon for new vacancies and guides." />
      )}
    </>
  );
}
