import { ListPageSkeleton } from "@/components/admin/skeletons";

export default function OrdersLoading() {
  return <ListPageSkeleton label="Loading orders…" tabs filters rows={8} />;
}
