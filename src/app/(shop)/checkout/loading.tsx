import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8" role="status">
      <span className="sr-only">Loading checkout…</span>
      <Skeleton className="mb-5 h-4 w-48" />
      <Skeleton className="mb-2 h-9 w-40" />
      <Skeleton className="mb-8 h-4 w-32" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}
