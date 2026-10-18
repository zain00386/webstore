import { BookGridSkeleton } from "@/components/book/book-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Skeleton className="mb-6 h-9 w-56" />
      <BookGridSkeleton count={8} />
    </div>
  );
}
