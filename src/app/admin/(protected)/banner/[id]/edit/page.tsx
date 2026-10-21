import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { publicImageUrl } from "@/lib/db/book-mapper";
import { POST_IMAGES_BUCKET } from "@/lib/db/posts";
import { createSessionClient } from "@/lib/supabase/server";
import { DeleteSlide, SlideForm } from "../../slide-form";

export const metadata: Metadata = { title: "Edit slide" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function EditSlidePage({ params }: PageProps<"/admin/banner/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: s } = await (await createSessionClient()).from("banner_slides").select("*").eq("id", id).maybeSingle();
  if (!s) notFound();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/banner" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Banner
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit slide</h1>
      </div>
      <SlideForm
        slide={{
          id: s.id,
          updatedAt: s.updated_at,
          imageUrl: publicImageUrl(supabaseUrl, POST_IMAGES_BUCKET, s.image_path),
          values: {
            eyebrow: s.eyebrow,
            title: s.title,
            body: s.body,
            examTag: s.exam_tag ?? "",
            buttonLabel: s.button_label,
            buttonHref: s.button_href,
            secondaryLabel: s.secondary_label ?? "",
            secondaryHref: s.secondary_href ?? "",
            isActive: s.is_active,
            sortOrder: String(s.sort_order),
          },
        }}
      />
      <section className="space-y-3 rounded-2xl p-5 ring-1 ring-destructive/30">
        <h2 className="font-semibold text-destructive">Delete this slide</h2>
        <DeleteSlide id={s.id} title={s.title} />
      </section>
    </div>
  );
}
