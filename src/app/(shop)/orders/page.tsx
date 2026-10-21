import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RecentOrdersList } from "@/components/orders/recent-orders-list";
import { getStoreInfo } from "@/lib/db/store-info";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export default async function MyOrdersPage() {
  const store = await getStoreInfo();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My orders" }]} />
      <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Your recent orders on this device. Open one to see its status and payment details. This list is saved only in
        this browser; anyone using this device can see it, so remove orders here on a shared computer.
      </p>
      <RecentOrdersList phoneDisplay={store.whatsappDisplay} phoneE164={store.phoneE164} />
    </div>
  );
}
