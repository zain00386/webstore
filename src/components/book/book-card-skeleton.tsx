import { Skeleton } from "@/components/ui/skeleton";
import { bookGridClass } from "./shop-book-card";

export function BookCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border" aria-hidden>
      <Skeleton className="mb-3 aspect-[2/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <Skeleton className="mt-3 h-5 w-1/3" />
      <Skeleton className="mt-3 h-11 w-full rounded-full sm:h-10" />
    </div>
  );
}

export function BookGridSkeleton({ count = 8, layout = "full" }: { count?: number; layout?: keyof typeof bookGridClass }) {
  return (
    <div className={bookGridClass[layout]} role="status">
      <span className="sr-only">Loading books…</span>
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}
