import type { Metadata } from "next";
import { FALLBACK_CATEGORY_SLUG } from "@/lib/admin/category-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { fetchAdminBookRows, fetchAdminCategories } from "@/lib/db/admin-books";
import { createSessionClient } from "@/lib/supabase/server";
import { CategoryRow, NewCategoryForm } from "./category-forms";

export const metadata: Metadata = { title: "Categories" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const db = await createSessionClient();
  const [categories, books] = await Promise.all([fetchAdminCategories(db), fetchAdminBookRows(db)]);
  const counts = new Map<string, number>();
  for (const b of books) if (b.category_id) counts.set(b.category_id, (counts.get(b.category_id) ?? 0) + 1);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lower &ldquo;Order&rdquo; numbers appear first in the shop. Hidden categories keep their books, but don&apos;t show in menus.
        </p>
      </div>
      <NewCategoryForm />
      <div className="overflow-hidden rounded-2xl ring-1 ring-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Categories</caption>
          <tbody className="divide-y divide-border bg-card">
            {categories.map((c) => (
              <CategoryRow key={`${c.id}-${c.name}-${c.sort_order}-${c.is_active}`} category={c} bookCount={counts.get(c.id) ?? 0} isFallback={c.slug === FALLBACK_CATEGORY_SLUG} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
