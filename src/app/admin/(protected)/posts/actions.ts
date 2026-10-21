"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkCoverFile } from "@/lib/admin/image-type";
import { postFormFromFormData, postFormSchema, toPostRow, type PostFormValues } from "@/lib/admin/post-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { removePostImages, uploadPostImage } from "@/lib/db/admin-posts";
import { refreshPosts } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type PostFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PostFormValues | "cover", string>>;
  values?: PostFormValues;
  /** Changes on every failed submit so the form re-mounts with the submitted values. */
  attempt?: number;
};

const CONFLICT =
  "This post was changed since you opened it (perhaps in another tab). Your changes were NOT saved. Copy your text somewhere safe, reload the page, then try again.";

function friendlyPostError(error: { code?: string; message: string; details?: string | null }): { field?: keyof PostFormValues; message: string } {
  const text = `${error.message} ${error.details ?? ""}`;
  if (error.code === "23505" && text.includes("slug")) return { field: "slug", message: "Another post already uses this web address. Change it slightly." };
  if (error.code === "23514" && text.includes("apply_url")) return { field: "applyUrl", message: "Use the full official link starting with https://" };
  if (error.code === "23514") return { message: "One of the values isn't allowed. Check the fields and try again." };
  if (error.code === "42501" || /row-level security|permission denied/i.test(text)) return { message: "You don't have permission to do this. Sign in again as an admin." };
  return { message: "Could not save. Please try again." };
}

/** Create (no "id") or update (with "id" + "updatedAt") a post. Everything is re-validated here. */
export async function savePost(_prev: PostFormState, fd: FormData): Promise<PostFormState> {
  await requireAdmin();
  const values = postFormFromFormData(fd);
  const fail = (s: Omit<PostFormState, "values" | "attempt">): PostFormState => ({ ...s, values, attempt: Date.now() });

  const idRaw = String(fd.get("id") ?? "");
  const id = idRaw ? z.uuid().safeParse(idRaw) : null;
  if (id && !id.success) return fail({ error: "Invalid post." });
  const expectedUpdatedAt = String(fd.get("updatedAt") ?? "");

  const parsed = postFormSchema.safeParse(values);
  const file = fd.get("cover");
  const cover = file instanceof File && file.size > 0 ? await checkCoverFile(file) : null;
  if (!parsed.success || (cover && !cover.ok)) {
    const fieldErrors: PostFormState["fieldErrors"] = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]) as keyof PostFormValues;
        fieldErrors[k] ??= issue.message;
      }
    }
    if (cover && !cover.ok) fieldErrors.cover = cover.error.replace("Cover", "Image");
    return fail({ error: "Please fix the highlighted fields.", fieldErrors });
  }

  const db = await createSessionClient();
  const row = toPostRow(parsed.data);
  const removeCover = fd.get("removeCover") === "on";

  let uploaded: string | null = null;
  if (cover?.ok) {
    try {
      uploaded = await uploadPostImage(db, row.slug, cover.bytes, cover.kind);
    } catch {
      return fail({ error: "Please fix the highlighted fields.", fieldErrors: { cover: "The image could not be uploaded. Try again." } });
    }
  }

  let savedId: string;
  if (id?.success) {
    const { data: existing } = await db.from("posts").select("cover_image_path").eq("id", id.data).maybeSingle();
    const coverChange = uploaded ? { cover_image_path: uploaded } : removeCover ? { cover_image_path: null } : {};
    const { data, error } = await db
      .from("posts")
      .update({ ...row, ...coverChange })
      .eq("id", id.data)
      .eq("updated_at", expectedUpdatedAt) // refuse to overwrite newer changes
      .select("id");
    if (error || !data?.length) {
      await removePostImages(db, [uploaded]);
      if (error) {
        const e = friendlyPostError(error);
        return fail({ error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined });
      }
      return fail({ error: CONFLICT });
    }
    if ((uploaded || removeCover) && existing?.cover_image_path) await removePostImages(db, [existing.cover_image_path]);
    savedId = id.data;
  } else {
    const { data, error } = await db
      .from("posts")
      .insert({ ...row, cover_image_path: uploaded })
      .select("id")
      .single();
    if (error || !data) {
      await removePostImages(db, [uploaded]);
      const e = friendlyPostError(error ?? { message: "no row returned" });
      return fail({ error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined });
    }
    savedId = data.id;
  }

  refreshPosts(); // the blog and home page show the change on the very next request
  redirect(`/admin/posts/${savedId}/edit?saved=1`);
}

/** Permanently delete a post. Requires typing DELETE. (Archiving hides it without deleting.) */
export async function deletePost(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = z.uuid().safeParse(String(fd.get("id") ?? ""));
  if (!id.success) return { error: "Invalid post." };
  if (String(fd.get("confirm") ?? "").trim() !== "DELETE") return { error: "Type DELETE (in capitals) to confirm." };

  const db = await createSessionClient();
  const { data: existing } = await db.from("posts").select("cover_image_path").eq("id", id.data).maybeSingle();
  const { data, error } = await db.from("posts").delete().eq("id", id.data).select("id");
  if (error) return { error: friendlyPostError(error).message };
  if (!data.length) return { error: "This post no longer exists." };
  await removePostImages(db, [existing?.cover_image_path]);

  refreshPosts();
  redirect("/admin/posts?deleted=1");
}
