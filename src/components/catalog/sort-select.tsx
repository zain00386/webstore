"use client";

import Form from "next/form";
import { sortOptions, type CatalogQuery } from "@/lib/catalog/query";

/** Sort dropdown that keeps the current filters. Changes apply immediately. */
export function SortSelect({ query }: { query: CatalogQuery }) {
  return (
    <Form action="/books" className="flex items-center gap-2">
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.category.map((c) => (
        <input key={c} type="hidden" name="category" value={c} />
      ))}
      {query.exam && <input type="hidden" name="exam" value={query.exam} />}
      {query.min != null && <input type="hidden" name="min" value={query.min} />}
      {query.max != null && <input type="hidden" name="max" value={query.max} />}
      {query.stock && <input type="hidden" name="stock" value={query.stock} />}
      <label htmlFor="sort" className="text-sm text-muted-foreground">
        Sort
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={query.sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-full border border-input bg-surface px-3 text-sm"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-sm underline">
          Apply
        </button>
      </noscript>
    </Form>
  );
}
