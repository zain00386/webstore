import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8" role="status">
      <span className="sr-only">Loading your cart…</span>
      <Skeleton className="mb-5 h-4 w-32" />
      <Skeleton className="mb-6 h-9 w-44" />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
