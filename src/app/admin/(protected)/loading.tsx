import { Skeleton } from "@/components/ui/skeleton";

/** Shown while an admin page checks your access and loads its data. */
export default function AdminPageLoading() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
