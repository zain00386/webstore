import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Newspaper, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminPosts } from "@/lib/db/admin-posts";
import { pakistanDate } from "@/lib/db/posts";
import { formatDate } from "@/lib/safe-url";
import { createSessionClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Posts" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

const filters = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "archived", label: "Archived" },
] as const;

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = filters.find((f) => f.id === sp.status)?.id ?? "all";
  const all = await fetchAdminPosts(await createSessionClient());
  const posts = filter === "all" ? all : all.filter((p) => p.status === filter);
  const now = new Date().toISOString();

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Job vacancies and blog articles. Only published posts appear on the site.</p>
        </div>
        <Button asChild size="pill">
          <Link href="/admin/posts/new">
            <Plus aria-hidden /> New post
          </Link>
        </Button>
      </div>

      {sp.deleted === "1" && <Alert tone="success">The post was deleted.</Alert>}

      <nav aria-label="Post filters" className="flex gap-1 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/admin/posts" : `/admin/posts?status=${f.id}`}
            aria-current={filter === f.id ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-medium ring-1 ring-border hover:bg-muted sm:min-h-10",
              filter === f.id && "bg-primary text-primary-foreground ring-primary hover:bg-primary",
            )}
          >
            {f.label} ({f.id === "all" ? all.length : all.filter((p) => p.status === f.id).length})
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={all.length === 0 ? "No posts yet" : "No posts here"}
          description={
            all.length === 0
              ? "Write your first vacancy or guide: it appears on the site as soon as you publish it."
              : "No posts have this status. Choose another filter above, or write a new post."
          }
          action={
            <Button asChild size="pill">
              <Link href="/admin/posts/new">New post</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {posts.map((p) => {
            const scheduled = p.status === "published" && p.published_at && p.published_at > now;
            return (
              <li key={p.id}>
                <Link href={`/admin/posts/${p.id}/edit`} className="flex items-center gap-3 p-4 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.kind === "vacancy" ? <Badge variant="brand">Vacancy</Badge> : <Badge>Blog</Badge>}
                      <Badge variant={scheduled ? "warning" : p.status === "published" ? "success" : "outline"}>
                        {scheduled ? "Scheduled" : p.status === "published" ? "Published" : p.status === "draft" ? "Draft" : "Archived"}
                      </Badge>
                    </div>
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.published_at && p.status === "published"
                        ? `${scheduled ? "Goes live" : "Published"} ${formatDate(pakistanDate(p.published_at))}`
                        : `Last edited ${formatDate(pakistanDate(p.updated_at))}`}
                      {p.vacancy_last_date && ` · Last date ${formatDate(p.vacancy_last_date)}`}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
