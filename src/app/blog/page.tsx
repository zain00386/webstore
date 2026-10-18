import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { getPublishedPosts } from "@/data/posts";
import { PostCard } from "@/components/blog/post-card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Job vacancies & blog",
  description: "Latest government and private job vacancies in Pakistan, with the books to prepare, plus study guides.",
};

const tabs = [
  { value: undefined, label: "All" },
  { value: "vacancy", label: "Vacancies" },
  { value: "blog", label: "Blog" },
] as const;

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
          return <PostList kind={kind} />;
        })}
      </Suspense>
    </div>
  );
}

function PostList({ kind }: { kind?: "vacancy" | "blog" }) {
  const posts = getPublishedPosts(kind);
  return (
    <>
      <nav aria-label="Post type" className="mb-6 flex gap-2">
        {tabs.map((t) => {
          const active = t.value === kind;
          return (
            <Link
              key={t.label}
              href={t.value ? `/blog?type=${t.value}` : "/blog"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-border hover:bg-muted",
                active && "bg-primary text-primary-foreground ring-primary hover:bg-primary",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {posts.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Newspaper} title="No posts yet" description="Check back soon for new vacancies and guides." />
      )}
    </>
  );
}
