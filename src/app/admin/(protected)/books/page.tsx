import type { Metadata } from "next";
import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import { adminBooksHref, filterAdminBooks, parseAdminBooksQuery } from "@/lib/admin/books-list";
import { requireAdmin } from "@/lib/auth/admin";
import { publicImageUrl, BOOK_COVERS_BUCKET } from "@/lib/db/book-mapper";
import { fetchAdminBookRows, fetchAdminCategories, fetchStoreLowStockThreshold } from "@/lib/db/admin-books";
import { getSupabasePublicConfig } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { adminField } from "@/components/admin/field-styles";
import { FilterForm, FilterLink, FilterResults, FilterScope, FilterSubmit } from "@/components/admin/filter-form";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";
import { QuickEditTable, type QuickRow } from "./quick-edit-table";

export const metadata: Metadata = { title: "Books" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

const select = `${adminField} h-11 min-w-0 px-2 sm:h-10`;

export default async function AdminBooksPage({ searchParams }: PageProps<"/admin/books">) {
  await requireAdmin();
  const params = await searchParams;
  const query = parseAdminBooksQuery(params);
  const db = await createSessionClient();
  const [rows, categories, threshold] = await Promise.all([fetchAdminBookRows(db), fetchAdminCategories(db), fetchStoreLowStockThreshold(db)]);
  const result = filterAdminBooks(rows, query, threshold);
  const supabaseUrl = getSupabasePublicConfig().ok ? process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "") : "";
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const outCount = rows.filter((r) => r.stock_quantity === 0).length;
  const hiddenCount = rows.filter((r) => !r.is_active).length;
  const newCount = rows.filter((r) => r.is_new_arrival).length;

  const quickRows: QuickRow[] = result.rows.map((r) => {
    const t = r.low_stock_threshold ?? threshold;
    return {
      id: r.id,
      title: r.title,
      publisher: r.publisher,
      categoryName: r.category_id ? (categoryName.get(r.category_id) ?? null) : null,
      coverUrl: publicImageUrl(supabaseUrl, BOOK_COVERS_BUCKET, r.cover_image_path),
      price: r.price,
      compareAtPrice: r.compare_at_price,
      stock: r.stock_quantity,
      isActive: r.is_active,
      isNewArrival: r.is_new_arrival,
      updatedAt: r.updated_at,
      lowStock: t != null && t > 0 && r.stock_quantity > 0 && r.stock_quantity <= t,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} books · {outCount} out of stock · {hiddenCount} hidden ·{" "}
            <Link href="/admin/books?home=new" className="underline underline-offset-4">
              {newCount} in New arrivals
            </Link>
          </p>
        </div>
        <Button asChild size="pill">
          <Link href="/admin/books/new">
            <Plus aria-hidden /> Add book
          </Link>
        </Button>
      </div>

      {params.deleted === "1" && <Alert tone="success">The book was deleted.</Alert>}

      <FilterScope>
        <FilterForm action="/admin/books" className="grid grid-cols-2 items-end gap-2 rounded-2xl bg-surface p-3 ring-1 ring-border sm:flex sm:flex-wrap">
          <label className="col-span-2 flex min-w-0 flex-col gap-1 text-xs font-medium sm:min-w-48 sm:flex-1">
            Search
            <input
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder="Title, author, publisher or ISBN"
              className={`${adminField} h-11 min-w-0 bg-card px-3 font-normal sm:h-10`}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Category
            <select name="category" defaultValue={query.category ?? ""} className={select}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="none">No category</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Stock
            <select name="stock" defaultValue={query.stock} className={select}>
              <option value="all">All</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Shop
            <select name="status" defaultValue={query.status} className={select}>
              <option value="all">On sale + hidden</option>
              <option value="active">On sale</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Home page
            <select name="home" defaultValue={query.home} className={select}>
              <option value="all">All books</option>
              <option value="new">New arrivals only</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-medium">
            Sort
            <select name="sort" defaultValue={query.sort} className={select}>
              <option value="updated">Recently changed</option>
              <option value="title">Title A–Z</option>
              <option value="stock-asc">Stock: lowest first</option>
              <option value="stock-desc">Stock: highest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
          <FilterSubmit className="h-11 sm:h-10">Apply</FilterSubmit>
          <Button asChild variant="ghost" className="h-11 sm:h-10">
            <FilterLink href="/admin/books">Clear</FilterLink>
          </Button>
        </FilterForm>

        <FilterResults className="space-y-6">

          <p className="text-sm text-muted-foreground">
            Showing {result.rows.length} of {result.total} matching book{result.total === 1 ? "" : "s"}
            {result.pageCount > 1 && ` (page ${result.page} of ${result.pageCount})`}
          </p>

          {result.rows.length > 0 ? (
            <>
              {/* key: a fresh table (and fresh drafts) for every page / filter */}
              <QuickEditTable key={adminBooksHref(query)} rows={quickRows} />
              <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(page) => adminBooksHref(query, { page })} link={FilterLink} />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No books match"
              description="Try a different search or clear the filters."
              action={
                <Button asChild variant="outline">
                  <FilterLink href="/admin/books">Clear filters</FilterLink>
                </Button>
              }
            />
          )}
        </FilterResults>
      </FilterScope>
    </div>
  );
}
