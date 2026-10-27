"use client";

import type { CatalogQuery } from "@/lib/catalog/query";
import { SubmitButton } from "@/components/forms/submit-button";
import { CatalogLink, formHref, useCatalogNavigation } from "./catalog-navigation";

export type FilterOption = { value: string; label: string; count?: number };
export type FilterGroup = { title: string; options: FilterOption[] };

type FilterFormProps = {
  query: CatalogQuery;
  exams: FilterGroup[];
  categories: FilterOption[];
  /** Shown only when there is more than one publisher. */
  publishers?: FilterOption[];
  idPrefix: string;
  /** Submit as soon as a checkbox/radio changes (desktop). */
  autoSubmit?: boolean;
  /** Keep Apply/Clear pinned to the bottom of a scrolling sheet (phone filters). */
  stickyActions?: boolean;
};

const fieldsetLegend = "mb-2 text-sm font-semibold";
// 44px rows on touch screens, compact on desktop.
const optionRow =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm transition-colors duration-150 hover:bg-muted lg:min-h-9";
const input = "size-4 shrink-0 accent-[var(--brand)]";
const optionLabel = "min-w-0 flex-1 break-words";

/**
 * Plain GET form: filters live in the URL (shareable, back button works) and
 * still work if JavaScript fails. All values are re-validated on the server.
 * With JavaScript, results load in a transition so the page shows it's working.
 */
export function FilterForm({ query, exams, categories, publishers = [], idPrefix, autoSubmit, stickyActions }: FilterFormProps) {
  const { pending, navigate } = useCatalogNavigation();
  const submitOnChange = autoSubmit
    ? (e: React.ChangeEvent<HTMLFormElement>) => {
        if (e.target instanceof HTMLInputElement && e.target.type !== "number") e.currentTarget.requestSubmit();
      }
    : undefined;

  return (
    <form
      action="/books"
      onChange={submitOnChange}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(formHref(e.currentTarget));
      }}
      aria-busy={pending || undefined}
      className="space-y-6"
    >
      {query.q && <input type="hidden" name="q" value={query.q} />}
      {query.sort !== "newest" && <input type="hidden" name="sort" value={query.sort} />}

      <label className={`${optionRow} font-medium`}>
        <input type="checkbox" name="stock" value="in" defaultChecked={query.stock === "in"} className={input} />
        In stock only
      </label>

      <fieldset>
        <legend className={fieldsetLegend}>Exam</legend>
        <label className={optionRow}>
          <input type="radio" name="exam" value="" defaultChecked={!query.exam} className={input} />
          All exams
        </label>
        {exams.map((group) => (
          <div key={group.title} className="mt-2">
            <p className="px-2 pt-1 pb-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.title}</p>
            {group.options.map((e) => (
              <label key={e.value} className={optionRow}>
                <input type="radio" name="exam" value={e.value} defaultChecked={query.exam === e.value} className={input} />
                <span className={optionLabel}>{e.label}</span>
                {e.count != null && <span className="text-xs text-muted-foreground tabular-nums">{e.count}</span>}
              </label>
            ))}
          </div>
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
            <span className={optionLabel}>{c.label}</span>
            {c.count != null && <span className="text-xs text-muted-foreground tabular-nums">{c.count}</span>}
          </label>
        ))}
      </fieldset>

      {publishers.length > 0 && (
        <fieldset>
          <legend className={fieldsetLegend}>Publisher</legend>
          {publishers.map((p) => (
            <label key={p.value} className={optionRow}>
              <input
                type="checkbox"
                name="publisher"
                value={p.value}
                defaultChecked={query.publisher.includes(p.value)}
                className={input}
              />
              <span className={optionLabel}>{p.label}</span>
              {p.count != null && <span className="text-xs text-muted-foreground tabular-nums">{p.count}</span>}
            </label>
          ))}
        </fieldset>
      )}

      {query.author && <input type="hidden" name="author" value={query.author} />}

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
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm lg:h-10"
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
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm lg:h-10"
          />
        </div>
      </fieldset>

      <div
        className={
          stickyActions
            ? "sticky bottom-0 -mx-5 flex gap-2 border-t border-border bg-popover px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            : "flex gap-2"
        }
      >
        <SubmitButton pending={pending} pendingLabel="Applying…" className="h-11 min-w-0 flex-1 lg:h-10">
          Apply filters
        </SubmitButton>
        <CatalogLink
          href="/books"
          className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:h-10"
        >
          Clear
        </CatalogLink>
      </div>
    </form>
  );
}
