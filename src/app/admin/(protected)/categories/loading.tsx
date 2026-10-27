import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <div className="max-w-4xl space-y-6" role="status">
      <span className="sr-only">Loading categories…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 p-3">
            <Skeleton className="h-9 min-w-48 flex-1" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
