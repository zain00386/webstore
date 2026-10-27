import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholders shaped like each admin page, so the layout doesn't jump when data arrives. */

function Status({ label }: { label: string }) {
  return <span className="sr-only">{label}</span>;
}

/** Heading, optional filter tabs / search bar, then a list or table of rows. */
export function ListPageSkeleton({ label, tabs, filters, rows = 6 }: { label: string; tabs?: boolean; filters?: boolean; rows?: number }) {
  return (
    <div className="space-y-5" role="status">
      <Status label={label} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      {tabs && (
        <div className="flex gap-1 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      )}
      {filters && <Skeleton className="h-16 w-full rounded-2xl" />}
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-12 w-9 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="hidden h-9 w-24 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Back link, heading, then the main form column with a narrow sidebar on wide screens. */
export function FormPageSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" role="status">
      <Status label={label} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl space-y-6" role="status">
      <Status label="Loading order…" />
      <Skeleton className="h-5 w-24" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-8" role="status">
      <Status label="Loading settings…" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-11 w-52 rounded-full" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
