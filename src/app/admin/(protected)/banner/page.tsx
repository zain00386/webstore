import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, GalleryHorizontal, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { publicImageUrl } from "@/lib/db/book-mapper";
import { POST_IMAGES_BUCKET } from "@/lib/db/posts";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutoVacanciesSwitch } from "./auto-switch";

export const metadata: Metadata = { title: "Banner" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminBannerPage({ searchParams }: PageProps<"/admin/banner">) {
  await requireAdmin();
  const sp = await searchParams;
  const db = await createSessionClient();
  const [{ data: slides, error }, { data: settings }] = await Promise.all([
    db.from("banner_slides").select("*").order("sort_order").order("created_at"),
    db.from("store_settings").select("banner_auto_vacancies").eq("id", true).maybeSingle(),
  ]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home page banner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The sliding banner at the top of the home page. Your slides show in order; with none, the banner is made
            automatically from new vacancies, new arrivals and popular exams.
          </p>
        </div>
        <Button asChild size="pill">
          <Link href="/admin/banner/new">
            <Plus aria-hidden /> Add slide
          </Link>
        </Button>
      </div>

      {sp.saved === "1" && <Alert tone="success">Saved. The home page shows the change now.</Alert>}
      {sp.deleted === "1" && <Alert tone="success">The slide was deleted.</Alert>}

      {error ? (
        <Alert tone="warning" title="Database update needed">
          Paste <code>supabase/migrations/20261021000010_banner_slides.sql</code> into the Supabase SQL Editor and click Run,
          then reload this page.
        </Alert>
      ) : (
        <>
          <AutoVacanciesSwitch on={settings?.banner_auto_vacancies !== false} />
          {slides.length === 0 ? (
            <EmptyState
              icon={GalleryHorizontal}
              title="No slides of your own yet"
              description="The banner is being made automatically. Add a slide to show your own message, picture and button."
              action={
                <Button asChild size="pill">
                  <Link href="/admin/banner/new">Add slide</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
              {slides.map((s) => {
                const img = publicImageUrl(supabaseUrl, POST_IMAGES_BUCKET, s.image_path);
                return (
                  <li key={s.id}>
                    <Link href={`/admin/banner/${s.id}/edit`} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          s.sort_order
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{s.title}</span>
                          <Badge variant={s.is_active ? "success" : "outline"}>{s.is_active ? "Showing" : "Hidden"}</Badge>
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Order {s.sort_order} · Button &ldquo;{s.button_label}&rdquo; → {s.button_href}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
