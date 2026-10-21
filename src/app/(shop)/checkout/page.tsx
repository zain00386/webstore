import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getStoreInfo } from "@/lib/db/store-info";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Delivery fees and payment methods switched on in Admin > Settings (cached; refreshed when settings are saved).
  const store = await getStoreInfo();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mb-8 text-sm text-muted-foreground">No account needed.</p>
      <CheckoutForm delivery={store.delivery} payments={store.payments} phoneE164={store.phoneE164} />
    </div>
  );
}
