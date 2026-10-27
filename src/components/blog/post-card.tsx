import Image from "next/image";
import Link from "next/link";
import { CalendarClock, Megaphone, Newspaper } from "lucide-react";
import { formatDate } from "@/lib/safe-url";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/types/post";

export function PostKindBadge({ post }: { post: Post }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {post.kind === "vacancy" ? <Badge variant="brand">Vacancy</Badge> : <Badge>Blog</Badge>}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
  const Icon = post.kind === "vacancy" ? Megaphone : Newspaper;
  return (
    <article className="relative flex h-full flex-col gap-3 rounded-2xl bg-card p-5 ring-1 ring-border transition-shadow hover:shadow-md">
      {post.coverUrl && (
        <Image
          src={post.coverUrl}
          alt=""
          width={640}
          height={360}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="-mx-5 -mt-5 mb-1 aspect-video w-[calc(100%+2.5rem)] max-w-none rounded-t-2xl object-cover"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <PostKindBadge post={post} />
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-base leading-snug font-semibold">
        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset">
          {post.title}
        </Link>
      </h3>
      {post.vacancy?.organisation && <p className="text-sm font-medium">{post.vacancy.organisation}</p>}
      <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        {post.vacancy?.lastDate && (
          <span className="inline-flex items-center gap-1 font-medium text-brand">
            <CalendarClock className="size-3.5" aria-hidden />
            Last date: {formatDate(post.vacancy.lastDate)}
          </span>
        )}
      </div>
    </article>
  );
}
