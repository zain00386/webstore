import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "New post" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/posts" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> All posts
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">New post</h1>
      </div>
      <PostForm post={null} />
    </div>
  );
}
