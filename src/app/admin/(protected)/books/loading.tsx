import { ListPageSkeleton } from "@/components/admin/skeletons";

export default function BooksLoading() {
  return <ListPageSkeleton label="Loading books…" filters rows={8} />;
}
