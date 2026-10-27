import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import { isoToPakistanLocal, type PostFormValues } from "@/lib/admin/post-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminPost } from "@/lib/db/admin-posts";
import { publicImageUrl } from "@/lib/db/book-mapper";
import { POST_IMAGES_BUCKET } from "@/lib/db/posts";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";
import { PostDangerZone } from "../../danger-zone";
import { PostForm } from "../../post-form";

export const metadata: Metadata = { title: "Edit post" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function EditPostPage({ params, searchParams }: PageProps<"/admin/posts/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await fetchAdminPost(await createSessionClient(), id);
  if (!post) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  const values: PostFormValues = {
    kind: post.kind,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    status: post.status,
    publishedAt: isoToPakistanLocal(post.published_at),
    seoTitle: post.seo_title ?? "",
    seoDescription: post.seo_description ?? "",
    examTag: post.exam_tag ?? "",
    vacancyOrganisation: post.vacancy_organisation ?? "",
    vacancyPositions: post.vacancy_positions ?? "",
    vacancyLocation: post.vacancy_location ?? "",
    vacancyLastDate: post.vacancy_last_date ?? "",
    applyUrl: post.apply_url ?? "",
  };
  const live = post.status === "published" && post.published_at !== null && post.published_at <= new Date().toISOString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/posts" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> All posts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit post</h1>
        </div>
        {live && (
          <Link href={`/blog/${post.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
            View on site <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        )}
      </div>

      {sp.saved === "1" && (
        <Alert tone="success">
          {live ? "Saved. The post is live on the site." : post.status === "published" ? "Saved. It will appear on the site at the publish time." : "Saved. Only admins can see it until you publish it."}
        </Alert>
      )}

      <PostForm
        key={post.updated_at}
        post={{
          id: post.id,
          updatedAt: post.updated_at,
          values,
          coverUrl: publicImageUrl(supabaseUrl, POST_IMAGES_BUCKET, post.cover_image_path),
        }}
      />
      <PostDangerZone id={post.id} title={post.title} />
    </div>
  );
}
