import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminCategories } from "@/lib/db/admin-books";
import { createSessionClient } from "@/lib/supabase/server";
import { BookForm } from "../book-form";

export const metadata: Metadata = { title: "Add book" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function NewBookPage() {
  await requireAdmin();
  const categories = await fetchAdminCategories(await createSessionClient());
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" aria-hidden /> All books
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add a book</h1>
      </div>
      <BookForm book={null} categories={categories} />
    </div>
  );
}
