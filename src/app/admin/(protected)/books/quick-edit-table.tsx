"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Pencil, Save, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { formatPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { quickUpdateBooks, type QuickEditResult } from "./actions";

export type QuickRow = {
  id: string;
  title: string;
  publisher: string | null;
  categoryName: string | null;
  coverUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
  isNewArrival: boolean;
  updatedAt: string;
  lowStock: boolean;
};

type Draft = { price: string; stock: string; isActive: boolean; isNewArrival: boolean };

const toDraft = (r: QuickRow): Draft => ({ price: String(r.price), stock: String(r.stock), isActive: r.isActive, isNewArrival: r.isNewArrival });

function draftError(d: Draft, row: QuickRow): string | null {
  if (!/^\d+$/.test(d.stock)) return "Stock must be a whole number (0 or more)";
  if (Number(d.stock) > 100_000) return "Stock is too high";
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(d.price)) return "Price must be a number like 1250";
  if (row.compareAtPrice != null && Number(d.price) >= row.compareAtPrice) {
    return `Price must stay below the 'was' price (${formatPKR(row.compareAtPrice)}). Edit the book to change it.`;
  }
  return null;
}

/**
 * Edit price, stock and visibility for many books, then save them in one go.
 * The server re-checks every value and refuses rows changed elsewhere meanwhile.
 */
export function QuickEditTable({ rows: initialRows }: { rows: QuickRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(initialRows.map((r) => [r.id, toDraft(r)])));
  const [status, setStatus] = useState<Record<string, QuickEditResult>>({});
  const [pending, startTransition] = useTransition();

  const changed = useMemo(
    () =>
      rows.filter((r) => {
        const d = drafts[r.id];
        return d.price !== String(r.price) || d.stock !== String(r.stock) || d.isActive !== r.isActive || d.isNewArrival !== r.isNewArrival;
      }),
    [rows, drafts],
  );
  const invalid = changed.filter((r) => draftError(drafts[r.id], r));

  const update = (id: string, patch: Partial<Draft>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
    setStatus((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };

  const save = () =>
    startTransition(async () => {
      const payload = changed.map((r) => ({
        id: r.id,
        updatedAt: r.updatedAt,
        price: Number(drafts[r.id].price),
        stockQuantity: Number(drafts[r.id].stock),
        isActive: drafts[r.id].isActive,
        isNewArrival: drafts[r.id].isNewArrival,
      }));
      const { results, error } = await quickUpdateBooks(payload);
      if (error) {
        toast.error(error);
        return;
      }
      const byId = Object.fromEntries(results.map((r) => [r.id, r]));
      setStatus((s) => ({ ...s, ...byId }));
      // Saved rows become the new baseline (with their new updated_at for the next save).
      setRows((rs) =>
        rs.map((r) => {
          const res = byId[r.id];
          if (!res?.ok) return r;
          const d = drafts[r.id];
          return { ...r, price: Number(d.price), stock: Number(d.stock), isActive: d.isActive, isNewArrival: d.isNewArrival, updatedAt: res.updatedAt };
        }),
      );
      const ok = results.filter((r) => r.ok).length;
      const bad = results.length - ok;
      if (ok) toast.success(`Saved ${ok} book${ok === 1 ? "" : "s"}. The shop is updated.`);
      if (bad) toast.error(`${bad} book${bad === 1 ? "" : "s"} could not be saved. See the red rows.`);
    });

  const reset = () => {
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, toDraft(r)])));
    setStatus({});
  };

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface/95 p-3 ring-1 ring-border backdrop-blur">
        <p className="text-sm" aria-live="polite">
          {changed.length === 0 ? "Change price, stock, 'On sale' or 'New arrival', then save." : `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`}
          {invalid.length > 0 && <span className="ml-2 font-medium text-destructive">{invalid.length} need fixing</span>}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={reset} disabled={pending || changed.length === 0}>
            <Undo2 aria-hidden /> Undo
          </Button>
          <Button type="button" onClick={save} disabled={pending || changed.length === 0 || invalid.length > 0}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Save changes
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl ring-1 ring-border">
        <table className="w-full text-sm md:min-w-[760px]">
          <thead className="hidden bg-muted text-left text-xs text-muted-foreground md:table-header-group">
            <tr>
              <th scope="col" className="p-3 font-medium">Book</th>
              <th scope="col" className="w-32 p-3 font-medium">Price (Rs.)</th>
              <th scope="col" className="w-28 p-3 font-medium">Stock</th>
              <th scope="col" className="w-24 p-3 font-medium">On sale</th>
              <th scope="col" className="w-28 p-3 font-medium">New arrival</th>
              <th scope="col" className="w-12 p-3"><span className="sr-only">Edit</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {rows.map((r) => {
              const d = drafts[r.id];
              const isChanged = changed.includes(r);
              const err = isChanged ? draftError(d, r) : null;
              const res = status[r.id];
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "grid grid-cols-2 gap-x-2 gap-y-2 p-3 sm:grid-cols-4 md:table-row md:p-0",
                    isChanged && "bg-warning-soft/40",
                    res && !res.ok && "bg-brand-soft/60",
                  )}
                >
                  <td className="col-span-full md:p-3">
                    <div className="flex items-center gap-3">
                      <span className="relative block h-12 w-9 shrink-0 overflow-hidden rounded bg-muted">
                        {r.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail; next/image adds nothing here
                          <img src={r.coverUrl} alt="" className="h-full w-full object-contain" loading="lazy" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <Link href={`/admin/books/${r.id}/edit`} className="line-clamp-2 font-medium hover:underline">
                          {r.title}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {[r.publisher, r.categoryName].filter(Boolean).join(" · ")}
                          {r.stock === 0 && <span className="ml-2 font-medium text-brand">Out of stock</span>}
                          {r.lowStock && <span className="ml-2 font-medium text-warning">Low stock</span>}
                        </span>
                        {err && <span className="block text-xs font-medium text-destructive">{err}</span>}
                        {res && !res.ok && (
                          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                            <X className="size-3" aria-hidden /> {res.error}
                          </span>
                        )}
                        {res?.ok && (
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <Check className="size-3" aria-hidden /> Saved
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="md:p-3">
                    <label className="mb-1 block text-xs text-muted-foreground md:sr-only" htmlFor={`price-${r.id}`}>
                      Price<span className="sr-only"> of {r.title}</span>
                    </label>
                    <input
                      id={`price-${r.id}`}
                      inputMode="decimal"
                      value={d.price}
                      onChange={(e) => update(r.id, { price: e.target.value.trim() })}
                      aria-invalid={Boolean(err) || undefined}
                      className="h-9 w-full rounded-lg border border-input bg-surface px-2 tabular-nums"
                    />
                  </td>
                  <td className="md:p-3">
                    <label className="mb-1 block text-xs text-muted-foreground md:sr-only" htmlFor={`stock-${r.id}`}>
                      Stock<span className="sr-only"> of {r.title}</span>
                    </label>
                    <input
                      id={`stock-${r.id}`}
                      inputMode="numeric"
                      value={d.stock}
                      onChange={(e) => update(r.id, { stock: e.target.value.trim() })}
                      aria-invalid={Boolean(err) || undefined}
                      className="h-9 w-full rounded-lg border border-input bg-surface px-2 tabular-nums"
                    />
                  </td>
                  <td className="md:p-3">
                    <span className="mb-1 block text-xs text-muted-foreground md:hidden" aria-hidden>
                      On sale
                    </span>
                    <label className="flex h-9 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.isActive}
                        onChange={(e) => update(r.id, { isActive: e.target.checked })}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="sr-only">Show {r.title} in the shop</span>
                      <span className="text-xs text-muted-foreground" aria-hidden>{d.isActive ? "Yes" : "Hidden"}</span>
                    </label>
                  </td>
                  <td className="md:p-3">
                    <span className="mb-1 block text-xs text-muted-foreground md:hidden" aria-hidden>
                      New arrival
                    </span>
                    <label className="flex h-9 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.isNewArrival}
                        onChange={(e) => update(r.id, { isNewArrival: e.target.checked })}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="sr-only">Show {r.title} in New arrivals on the home page</span>
                      <span className="text-xs text-muted-foreground" aria-hidden>{d.isNewArrival ? "Yes" : "No"}</span>
                    </label>
                  </td>
                  <td className="hidden md:table-cell md:p-3">
                    <Link
                      href={`/admin/books/${r.id}/edit`}
                      className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
                      aria-label={`Edit all details of ${r.title}`}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
