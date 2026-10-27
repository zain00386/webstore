import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { z } from "zod";
import type { BookFormValues } from "@/lib/admin/book-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { BOOK_COVERS_BUCKET, publicImageUrl } from "@/lib/db/book-mapper";
import { fetchAdminBook, fetchAdminCategories } from "@/lib/db/admin-books";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";
import { BookForm } from "../../book-form";
import { DangerZone } from "../../danger-zone";

export const metadata: Metadata = { title: "Edit book" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function EditBookPage({ params, searchParams }: PageProps<"/admin/books/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const db = await createSessionClient();
  const [book, categories] = await Promise.all([fetchAdminBook(db, id), fetchAdminCategories(db)]);
  if (!book) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  const values: BookFormValues = {
    title: book.title,
    subtitle: book.subtitle ?? "",
    slug: book.slug,
    author: book.author ?? "",
    publisher: book.publisher ?? "",
    edition: book.edition ?? "",
    isbn: book.isbn ?? "",
    description: book.description,
    categoryId: book.category_id ?? "",
    examTags: book.exam_tags,
    language: (book.language ?? "") as BookFormValues["language"],
    price: String(Number(book.price)),
    compareAtPrice: book.compare_at_price == null ? "" : String(Number(book.compare_at_price)),
    stockQuantity: String(book.stock_quantity),
    lowStockThreshold: book.low_stock_threshold == null ? "" : String(book.low_stock_threshold),
    isActive: book.is_active,
    isNewArrival: book.is_new_arrival,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/books" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden /> All books
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Edit book</h1>
        </div>
        {book.is_active && (
          <Link
            href={`/books/${book.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            View in shop <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </Link>
        )}
      </div>

      {sp.saved === "1" && <Alert tone="success">Saved. The shop now shows these details.</Alert>}
      {!book.is_active && <Alert tone="warning">This book is hidden from the shop.</Alert>}

      <BookForm
        key={book.updated_at}
        book={{
          id: book.id,
          updatedAt: book.updated_at,
          values,
          coverUrl: publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, book.cover_image_path),
          galleryUrls: (book.gallery_paths ?? []).map((p) => publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, p)!).filter(Boolean),
        }}
        categories={categories}
      />
      <DangerZone id={book.id} title={book.title} />
    </div>
  );
}
