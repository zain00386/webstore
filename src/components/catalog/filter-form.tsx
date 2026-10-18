"use client";

import Form from "next/form";
import Link from "next/link";
import type { CatalogQuery } from "@/lib/catalog/query";
import { Button } from "@/components/ui/button";

export type FilterOption = { value: string; label: string; count?: number };

type FilterFormProps = {
  query: CatalogQuery;
  exams: FilterOption[];
  categories: FilterOption[];
  idPrefix: string;
  /** Submit as soon as a checkbox/radio changes (desktop). */
  autoSubmit?: boolean;
};

const fieldsetLegend = "mb-2 text-sm font-semibold";
const optionRow = "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-muted";
const input = "size-4 accent-[var(--brand)]";

/**
 * Plain GET form: filters live in the URL (shareable, back button works) and
 * still work if JavaScript fails. All values are re-validated on the server.
 */
export function FilterForm({ query, exams, categories, idPrefix, autoSubmit }: FilterFormProps) {
  const submitOnChange = autoSubmit
    ? (e: React.ChangeEvent<HTMLFormElement>) => {
        if (e.target instanceof HTMLInputElement && e.target.type !== "number") e.currentTarget.requestSubmit();
      }
    : undefined;

  return (
    <Form action="/books" onChange={submitOnChange} className="space-y-6">
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.sort !== "newest" && <input type="hidden" name="sort" value={query.sort} />}

      <fieldset>
        <legend className={fieldsetLegend}>Exam</legend>
        <label className={optionRow}>
          <input type="radio" name="exam" value="" defaultChecked={!query.exam} className={input} />
          All exams
        </label>
        {exams.map((e) => (
          <label key={e.value} className={optionRow}>
            <input type="radio" name="exam" value={e.value} defaultChecked={query.exam === e.value} className={input} />
            {e.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={fieldsetLegend}>Category</legend>
        {categories.map((c) => (
          <label key={c.value} className={optionRow}>
            <input
              type="checkbox"
              name="category"
              value={c.value}
              defaultChecked={query.category.includes(c.value)}
              className={input}
            />
            <span className="flex-1">{c.label}</span>
            {c.count != null && <span className="text-xs text-muted-foreground">{c.count}</span>}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend className={fieldsetLegend}>Price (Rs.)</legend>
        <div className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-min`} className="sr-only">
            Minimum price
          </label>
          <input
            id={`${idPrefix}-min`}
            name="min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min"
            defaultValue={query.min ?? ""}
            className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm"
          />
          <span aria-hidden>–</span>
          <label htmlFor={`${idPrefix}-max`} className="sr-only">
            Maximum price
          </label>
          <input
            id={`${idPrefix}-max`}
            name="max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max"
            defaultValue={query.max ?? ""}
            className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm"
          />
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="outline">
          <Link href="/books">Clear</Link>
        </Button>
      </div>
    </Form>
  );
}
