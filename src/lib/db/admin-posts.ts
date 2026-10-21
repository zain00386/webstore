import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImageKind } from "@/lib/admin/image-type";
import type { Database, PostRow } from "@/lib/supabase/database.types";
import { POST_IMAGES_BUCKET } from "./posts";
import { DataError } from "./queries";

type Db = SupabaseClient<Database>;

export type AdminPostListRow = Pick<PostRow, "id" | "slug" | "title" | "kind" | "status" | "published_at" | "updated_at" | "vacancy_last_date">;

/** Every post (drafts too). Runs as the signed-in admin; database rules apply. */
export async function fetchAdminPosts(db: Db): Promise<AdminPostListRow[]> {
  const { data, error } = await db
    .from("posts")
    .select("id, slug, title, kind, status, published_at, updated_at, vacancy_last_date")
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw new DataError("posts", error);
  return data;
}

export async function fetchAdminPost(db: Db, id: string): Promise<PostRow | null> {
  const { data, error } = await db.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new DataError("post", error);
  return data;
}

/** Stores an uploaded post image under posts/<slug>-<random>.<ext>; returns the storage path. */
export async function uploadPostImage(db: Db, slug: string, bytes: Uint8Array, kind: ImageKind): Promise<string> {
  const path = `posts/${slug.slice(0, 80)}-${randomBytes(4).toString("hex")}.${kind.ext}`;
  const { error } = await db.storage.from(POST_IMAGES_BUCKET).upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new DataError("image upload", error);
  return path;
}

export async function removePostImages(db: Db, paths: (string | null | undefined)[]) {
  const ours = paths.filter((p): p is string => Boolean(p) && !p!.startsWith("https://"));
  if (ours.length) await db.storage.from(POST_IMAGES_BUCKET).remove(ours);
}
