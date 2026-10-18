"use server";

import { z } from "zod";
import { editCategorySchema, FALLBACK_CATEGORY_SLUG, newCategorySchema } from "@/lib/admin/category-schema";
import { friendlyBookError } from "@/lib/admin/db-errors";
import { requireAdmin } from "@/lib/auth/admin";
import { refreshShop } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type CategoryState = { ok?: string; error?: string; fieldErrors?: Record<string, string>; attempt?: number };

const firstErrors = (e: z.ZodError) =>
  Object.fromEntries(Object.entries(e.flatten().fieldErrors).map(([k, v]) => [k, (v as string[] | undefined)?.[0] ?? ""]));

export async function createCategory(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  await requireAdmin();
  const parsed = newCategorySchema.safeParse({
    name: String(fd.get("name") ?? ""),
    slug: String(fd.get("slug") ?? ""),
    sortOrder: String(fd.get("sortOrder") ?? "500"),
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: firstErrors(parsed.error), attempt: Date.now() };

  const db = await createSessionClient();
  const { error } = await db.from("categories").insert({ name: parsed.data.name, slug: parsed.data.slug, sort_order: parsed.data.sortOrder });
  if (error) {
    const duplicate = error.code === "23505";
    return {
      error: duplicate ? "A category with this web address already exists." : friendlyBookError(error).message,
      fieldErrors: duplicate ? { slug: "Already used" } : undefined,
      attempt: Date.now(),
    };
  }
  refreshShop(); // the shop shows the change on the very next request
  return { ok: `Added “${parsed.data.name}”.`, attempt: Date.now() };
}

export async function updateCategory(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  await requireAdmin();
  const parsed = editCategorySchema.safeParse({
    id: String(fd.get("id") ?? ""),
    name: String(fd.get("name") ?? ""),
    sortOrder: String(fd.get("sortOrder") ?? ""),
    isActive: fd.get("isActive") === "on",
  });
  if (!parsed.success) return { error: Object.values(firstErrors(parsed.error))[0] || "Invalid values.", attempt: Date.now() };

  const db = await createSessionClient();
  const { data, error } = await db
    .from("categories")
    .update({ name: parsed.data.name, sort_order: parsed.data.sortOrder, is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { error: friendlyBookError(error).message, attempt: Date.now() };
  if (!data.length) return { error: "This category no longer exists.", attempt: Date.now() };
  refreshShop(); // the shop shows the change on the very next request
  return { ok: "Saved.", attempt: Date.now() };
}

/** Deletes a category after moving its books to "Other books", so no book disappears. */
export async function deleteCategory(_prev: CategoryState, fd: FormData): Promise<CategoryState> {
  await requireAdmin();
  const id = z.uuid().safeParse(String(fd.get("id") ?? ""));
  if (!id.success) return { error: "Invalid category." };
  if (String(fd.get("confirm") ?? "") !== "yes") return { error: "Please confirm." };

  const db = await createSessionClient();
  const { data: cats, error: readError } = await db.from("categories").select("id, slug").in("slug", [FALLBACK_CATEGORY_SLUG]);
  if (readError) return { error: friendlyBookError(readError).message };
  const fallback = cats?.[0];
  if (!fallback) return { error: "The “Other books” category is missing, so books can't be moved. Nothing was deleted." };
  if (fallback.id === id.data) return { error: "“Other books” can't be deleted: it holds books from deleted categories." };

  const { error: moveError } = await db.from("books").update({ category_id: fallback.id }).eq("category_id", id.data);
  if (moveError) return { error: friendlyBookError(moveError).message };
  const { data, error } = await db.from("categories").delete().eq("id", id.data).select("name");
  if (error) return { error: friendlyBookError(error).message };
  if (!data.length) return { error: "This category no longer exists." };

  refreshShop(); // the shop shows the change on the very next request
  return { ok: `Deleted “${data[0].name}”. Its books moved to “Other books”.`, attempt: Date.now() };
}
