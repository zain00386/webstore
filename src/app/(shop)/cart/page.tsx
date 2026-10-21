import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getStoreInfo } from "@/lib/db/store-info";
import { cheapestDelivery } from "@/lib/store-info";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const store = await getStoreInfo();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Your cart</h1>
      <CartView cheapestDelivery={cheapestDelivery(store)} />
    </div>
  );
}
