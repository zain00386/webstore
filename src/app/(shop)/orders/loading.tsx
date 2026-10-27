import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8" role="status">
      <span className="sr-only">Loading your orders…</span>
      <Skeleton className="mb-5 h-4 w-40" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-2 mb-6 h-10 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
