"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bookFormFromFormData, bookFormSchema, quickEditSchema, toBookRow, type BookFormValues } from "@/lib/admin/book-schema";
import { friendlyBookError } from "@/lib/admin/db-errors";
import { checkCoverFile } from "@/lib/admin/image-type";
import { requireAdmin } from "@/lib/auth/admin";
import { removeStoredImages, uploadCover } from "@/lib/db/admin-books";
import { refreshShop } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type BookFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof BookFormValues | "cover", string>>;
  values?: BookFormValues;
  /** Changes on every failed submit so the form re-mounts with the submitted values. */
  attempt?: number;
};

const CONFLICT =
  "This book was changed since you opened it (for example by an order or in another tab). Your changes were NOT saved. Reload the page to see the latest values, then try again.";

/**
 * Create (no "id" field) or update (with "id" + "updatedAt") a book.
 * Everything is re-validated here; the browser's checks are only for convenience.
 */
export async function saveBook(_prev: BookFormState, fd: FormData): Promise<BookFormState> {
  await requireAdmin();
  const values = bookFormFromFormData(fd);
  const fail = (s: Omit<BookFormState, "values" | "attempt">): BookFormState => ({ ...s, values, attempt: Date.now() });

  const idRaw = String(fd.get("id") ?? "");
  const id = idRaw ? z.uuid().safeParse(idRaw) : null;
  if (id && !id.success) return fail({ error: "Invalid book." });
  const expectedUpdatedAt = String(fd.get("updatedAt") ?? "");

  const parsed = bookFormSchema.safeParse(values);
  const file = fd.get("cover");
  const cover = file instanceof File && file.size > 0 ? await checkCoverFile(file) : null;

  if (!parsed.success || (cover && !cover.ok)) {
    const fieldErrors: BookFormState["fieldErrors"] = {};
    if (!parsed.success) {
      for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (msgs?.[0]) fieldErrors[k as keyof BookFormValues] = msgs[0];
      }
    }
    if (cover && !cover.ok) fieldErrors.cover = cover.error;
    return fail({ error: "Please fix the highlighted fields.", fieldErrors });
  }

  const db = await createSessionClient();
  const row = toBookRow(parsed.data);
  const removeCover = fd.get("removeCover") === "on";

  let uploaded: string | null = null;
  if (cover?.ok) {
    try {
      uploaded = await uploadCover(db, row.slug, cover.bytes, cover.kind);
    } catch {
      return fail({ fieldErrors: { cover: "The cover could not be uploaded. Try again." }, error: "Please fix the highlighted fields." });
    }
  }

  let savedId: string;
  if (id?.success) {
    const { data: existing } = await db.from("books").select("cover_image_path").eq("id", id.data).maybeSingle();
    const coverChange = uploaded ? { cover_image_path: uploaded } : removeCover ? { cover_image_path: null } : {};
    const { data, error } = await db
      .from("books")
      .update({ ...row, ...coverChange })
      .eq("id", id.data)
      .eq("updated_at", expectedUpdatedAt) // refuse to overwrite newer changes
      .select("id");
    if (error || !data?.length) {
      await removeStoredImages(db, [uploaded]);
      if (error) {
        const e = friendlyBookError(error);
        return fail({ error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined });
      }
      return fail({ error: CONFLICT });
    }
    if ((uploaded || removeCover) && existing?.cover_image_path) await removeStoredImages(db, [existing.cover_image_path]);
    savedId = id.data;
  } else {
    const { data, error } = await db
      .from("books")
      .insert({ ...row, cover_image_path: uploaded })
      .select("id")
      .single();
    if (error || !data) {
      await removeStoredImages(db, [uploaded]);
      const e = friendlyBookError(error ?? { message: "no row returned" });
      return fail({ error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined });
    }
    savedId = data.id;
  }

  refreshShop(); // the shop shows the change on the very next request
  redirect(`/admin/books/${savedId}/edit?saved=1`);
}

export type QuickEditResult = { id: string; ok: true; updatedAt: string } | { id: string; ok: false; error: string };

/** Save price / stock / visibility for many books at once (the quick-edit table). */
export async function quickUpdateBooks(changes: unknown): Promise<{ results: QuickEditResult[]; error?: string }> {
  await requireAdmin();
  const parsed = quickEditSchema.safeParse(changes);
  if (!parsed.success) return { results: [], error: "Some values aren't valid (stock must be a whole number 0 or more, price 0 or more)." };

  const db = await createSessionClient();
  const results: QuickEditResult[] = [];
  for (const c of parsed.data) {
    const { data, error } = await db
      .from("books")
      .update({ price: c.price, stock_quantity: c.stockQuantity, is_active: c.isActive })
      .eq("id", c.id)
      .eq("updated_at", c.updatedAt)
      .select("id, updated_at");
    if (error) results.push({ id: c.id, ok: false, error: friendlyBookError(error).message });
    else if (!data.length) results.push({ id: c.id, ok: false, error: "Changed elsewhere since you loaded the page. Reload to see the latest." });
    else results.push({ id: c.id, ok: true, updatedAt: data[0].updated_at });
  }
  if (results.some((r) => r.ok)) refreshShop(); // the shop shows the change on the very next request
  return { results };
}

/** Permanently delete a book. Requires typing DELETE. Past orders keep their copy of the title and price. */
export async function deleteBook(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = z.uuid().safeParse(String(fd.get("id") ?? ""));
  if (!id.success) return { error: "Invalid book." };
  if (String(fd.get("confirm") ?? "").trim() !== "DELETE") return { error: "Type DELETE (in capitals) to confirm." };

  const db = await createSessionClient();
  const { data: existing } = await db.from("books").select("cover_image_path, gallery_paths").eq("id", id.data).maybeSingle();
  const { data, error } = await db.from("books").delete().eq("id", id.data).select("id");
  if (error) return { error: friendlyBookError(error).message };
  if (!data.length) return { error: "This book no longer exists." };
  if (existing) await removeStoredImages(db, [existing.cover_image_path, ...(existing.gallery_paths ?? [])]);

  refreshShop(); // the shop shows the change on the very next request
  redirect("/admin/books?deleted=1");
}
