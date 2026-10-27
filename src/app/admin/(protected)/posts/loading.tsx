import { ListPageSkeleton } from "@/components/admin/skeletons";

export default function PostsLoading() {
  return <ListPageSkeleton label="Loading posts…" tabs rows={6} />;
}
