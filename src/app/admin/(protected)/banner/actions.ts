"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bannerSlideFromFormData, bannerSlideSchema, toBannerRow, type BannerSlideValues } from "@/lib/admin/banner-schema";
import { checkCoverFile } from "@/lib/admin/image-type";
import { requireAdmin } from "@/lib/auth/admin";
import { removePostImages, uploadPostImage } from "@/lib/db/admin-posts";
import { toSlug } from "@/lib/catalog/lahore-import";
import { refreshBanner, refreshShop } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type SlideFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof BannerSlideValues | "image", string>>;
  values?: BannerSlideValues;
  attempt?: number;
};

const CONFLICT = "This slide was changed somewhere else (another tab or admin). Your changes were NOT saved. Reload the page and try again.";
const NEEDS_UPDATE = "The database needs an update first: paste supabase/migrations/20261021000010_banner_slides.sql into the Supabase SQL Editor and click Run.";

/** Create (no "id") or update (with "id" + "updatedAt") a banner slide. Everything is re-validated here. */
export async function saveSlide(_prev: SlideFormState, fd: FormData): Promise<SlideFormState> {
  await requireAdmin();
  const values = bannerSlideFromFormData(fd);
  const fail = (s: Omit<SlideFormState, "values" | "attempt">): SlideFormState => ({ ...s, values, attempt: Date.now() });

  const idRaw = String(fd.get("id") ?? "");
  const id = idRaw ? z.uuid().safeParse(idRaw) : null;
  if (id && !id.success) return fail({ error: "Invalid slide." });

  const parsed = bannerSlideSchema.safeParse(values);
  const file = fd.get("image");
  const image = file instanceof File && file.size > 0 ? await checkCoverFile(file) : null;
  if (!parsed.success || (image && !image.ok)) {
    const fieldErrors: SlideFormState["fieldErrors"] = {};
    if (!parsed.success) for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0]) as keyof BannerSlideValues] ??= issue.message;
    if (image && !image.ok) fieldErrors.image = image.error.replace("Cover", "Picture");
    return fail({ error: "Please fix the highlighted fields.", fieldErrors });
  }

  const db = await createSessionClient();
  const row = toBannerRow(parsed.data);
  let uploaded: string | null = null;
  if (image?.ok) {
    try {
      uploaded = await uploadPostImage(db, toSlug(row.title) || "slide", image.bytes, image.kind, "banners");
    } catch {
      return fail({ error: "Please fix the highlighted fields.", fieldErrors: { image: "The picture could not be uploaded. Try again." } });
    }
  }
  const removeImage = fd.get("removeImage") === "on";

  if (id?.success) {
    const { data: existing } = await db.from("banner_slides").select("image_path").eq("id", id.data).maybeSingle();
    const imageChange = uploaded ? { image_path: uploaded } : removeImage ? { image_path: null } : {};
    const { data, error } = await db
      .from("banner_slides")
      .update({ ...row, ...imageChange })
      .eq("id", id.data)
      .eq("updated_at", String(fd.get("updatedAt") ?? ""))
      .select("id");
    if (error || !data?.length) {
      await removePostImages(db, [uploaded]);
      return fail({ error: error ? (error.code === "42P01" || error.code === "PGRST205" ? NEEDS_UPDATE : "Could not save. Please try again.") : CONFLICT });
    }
    if ((uploaded || removeImage) && existing?.image_path) await removePostImages(db, [existing.image_path]);
  } else {
    const { error } = await db.from("banner_slides").insert({ ...row, image_path: uploaded });
    if (error) {
      await removePostImages(db, [uploaded]);
      return fail({ error: error.code === "42P01" || error.code === "PGRST205" ? NEEDS_UPDATE : "Could not save. Please try again." });
    }
  }
  refreshBanner(); // the home page shows the change on the very next visit
  redirect("/admin/banner?saved=1");
}

/** Permanently delete a slide (and its picture). Requires ticking "yes". */
export async function deleteSlide(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const id = z.uuid().safeParse(String(fd.get("id") ?? ""));
  if (!id.success) return { error: "Invalid slide." };
  if (fd.get("confirm") !== "yes") return { error: "Please confirm." };
  const db = await createSessionClient();
  const { data, error } = await db.from("banner_slides").delete().eq("id", id.data).select("image_path");
  if (error) return { error: "Could not delete. Please try again." };
  if (!data.length) return { error: "This slide no longer exists." };
  await removePostImages(db, [data[0].image_path]);
  refreshBanner();
  redirect("/admin/banner?deleted=1");
}

/** Switch automatic slides for new vacancy posts on or off. */
export async function saveBannerAuto(_prev: { ok?: string; error?: string }, fd: FormData): Promise<{ ok?: string; error?: string }> {
  await requireAdmin();
  const on = fd.get("autoVacancies") === "on";
  const db = await createSessionClient();
  const { data, error } = await db.from("store_settings").update({ banner_auto_vacancies: on }).eq("id", true).select("id");
  if (error || !data.length) return { error: "Couldn't save. Please try again." };
  refreshShop(); // public settings are part of the cached catalogue
  return { ok: on ? "New vacancy posts will also appear in the banner." : "Only your own slides will appear in the banner." };
}
