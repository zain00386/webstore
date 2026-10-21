import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabasePublicConfig } from "@/lib/env";
import type { PostRow } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";
import type { Post } from "@/types/post";
import { publicImageUrl } from "./book-mapper";
import { DataError } from "./queries";

/** Invalidate with updateTag(POSTS_TAG) after a post is saved or deleted. */
export const POSTS_TAG = "posts";
export const POST_IMAGES_BUCKET = "post-images";

const PUBLIC_COLUMNS =
  "id, slug, title, kind, excerpt, body, cover_image_path, published_at, seo_title, seo_description, vacancy_organisation, vacancy_positions, vacancy_location, vacancy_last_date, apply_url, exam_tag";

type PublicPostRow = Pick<
  PostRow,
  | "id"
  | "slug"
  | "title"
  | "kind"
  | "excerpt"
  | "body"
  | "cover_image_path"
  | "published_at"
  | "seo_title"
  | "seo_description"
  | "vacancy_organisation"
  | "vacancy_positions"
  | "vacancy_location"
  | "vacancy_last_date"
  | "apply_url"
  | "exam_tag"
>;

/** "2026-10-21T20:30:00Z" -> "2026-10-22" (Pakistan is UTC+5 all year). */
export function pakistanDate(iso: string): string {
  return new Date(Date.parse(iso) + 5 * 3600_000).toISOString().slice(0, 10);
}

export function mapPostRow(r: PublicPostRow, supabaseUrl: string): Post {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    kind: r.kind,
    excerpt: r.excerpt,
    body: r.body,
    coverUrl: publicImageUrl(supabaseUrl, POST_IMAGES_BUCKET, r.cover_image_path),
    publishedAt: pakistanDate(r.published_at ?? new Date(0).toISOString()),
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    examSlug: r.exam_tag,
    vacancy:
      r.kind === "vacancy"
        ? {
            organisation: r.vacancy_organisation,
            positions: r.vacancy_positions,
            location: r.vacancy_location,
            lastDate: r.vacancy_last_date,
            applyUrl: r.apply_url,
          }
        : null,
  };
}

/**
 * All published posts, newest first. Read with the visitor key, so the database
 * rules guarantee drafts, archived and scheduled posts are never included.
 */
export async function loadPublishedPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_TAG);

  const config = getSupabasePublicConfig();
  if (!config.ok) return [];
  const { data, error } = await createPublicClient()
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(500)
    .returns<PublicPostRow[]>();
  if (error) throw new DataError("posts", error);
  return data.map((r) => mapPostRow(r, config.value.url));
}

export async function getPublishedPosts(kind?: Post["kind"]): Promise<Post[]> {
  const posts = await loadPublishedPosts();
  return kind ? posts.filter((p) => p.kind === kind) : posts;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return (await loadPublishedPosts()).find((p) => p.slug === slug) ?? null;
}
