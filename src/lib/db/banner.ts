import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getSupabasePublicConfig } from "@/lib/env";
import type { OwnerSlide } from "@/lib/home/hero-slides";
import type { BannerSlideRow } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";
import { publicImageUrl } from "./book-mapper";
import { POST_IMAGES_BUCKET } from "./posts";

/** Invalidate with updateTag(BANNER_TAG) after a slide is saved or deleted. */
export const BANNER_TAG = "banner";

export type CustomSlide = OwnerSlide;

export function mapSlideRow(r: BannerSlideRow, supabaseUrl: string): CustomSlide {
  return {
    id: r.id,
    eyebrow: r.eyebrow,
    title: r.title,
    body: r.body,
    imageUrl: publicImageUrl(supabaseUrl, POST_IMAGES_BUCKET, r.image_path),
    examTag: r.exam_tag,
    button: { label: r.button_label, href: r.button_href },
    secondary: r.secondary_label && r.secondary_href ? { label: r.secondary_label, href: r.secondary_href } : null,
  };
}

/**
 * Switched-on slides in the owner's order. Read with the visitor key (database
 * rules hide switched-off slides). Empty if the table isn't installed yet.
 */
export async function loadBannerSlides(): Promise<CustomSlide[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(BANNER_TAG);
  const config = getSupabasePublicConfig();
  if (!config.ok) return [];
  const { data, error } = await createPublicClient()
    .from("banner_slides")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at")
    .limit(12);
  if (error) return []; // e.g. database update 0010 not run yet: the automatic banner is shown instead
  return data.map((r) => mapSlideRow(r, config.value.url));
}
