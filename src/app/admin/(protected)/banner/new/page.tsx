import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { SlideForm } from "../slide-form";

export const metadata: Metadata = { title: "New slide" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function NewSlidePage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/banner" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> Banner
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New slide</h1>
      </div>
      <SlideForm slide={null} />
    </div>
  );
}
