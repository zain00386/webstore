"use client";

import { useState } from "react";
import { sortOptions, type CatalogQuery } from "@/lib/catalog/query";
import { Spinner } from "@/components/ui/spinner";
import { formHref, useCatalogNavigation } from "./catalog-navigation";

/** Sort dropdown that keeps the current filters. Changes apply immediately. */
export function SortSelect({ query }: { query: CatalogQuery }) {
  const { pending, navigate } = useCatalogNavigation();
  // Only say "Sorting…" when THIS control started the navigation (not a filter change).
  const [changed, setChanged] = useState(false);
  const sorting = pending && changed;
  return (
    <form
      action="/books"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(formHref(e.currentTarget));
      }}
      className="flex items-center gap-2"
    >
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.category.map((c) => (
        <input key={c} type="hidden" name="category" value={c} />
      ))}
      {query.publisher.map((p) => (
        <input key={p} type="hidden" name="publisher" value={p} />
      ))}
      {query.author && <input type="hidden" name="author" value={query.author} />}
      {query.exam && <input type="hidden" name="exam" value={query.exam} />}
      {query.min != null && <input type="hidden" name="min" value={query.min} />}
      {query.max != null && <input type="hidden" name="max" value={query.max} />}
      {query.stock && <input type="hidden" name="stock" value={query.stock} />}
      <label htmlFor="sort" className="text-sm text-muted-foreground">
        {sorting ? (
          <span className="flex items-center gap-1.5" role="status">
            <Spinner className="size-4" /> Sorting…
          </span>
        ) : (
          "Sort"
        )}
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={query.sort}
        onChange={(e) => {
          setChanged(true);
          e.currentTarget.form?.requestSubmit();
        }}
        aria-busy={sorting || undefined}
        className="h-11 min-w-0 rounded-full border border-input bg-surface px-3 text-sm transition-colors duration-150 hover:bg-muted sm:h-10"
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
    </form>
  );
}
