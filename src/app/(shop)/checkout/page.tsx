import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { paymentAvailability } from "@/lib/checkout/rules";
import { getCatalogState } from "@/lib/db/catalog";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  // Which payment methods are switched on in Admin > Settings (cached; refreshed when settings are saved).
  const state = await getCatalogState();
  const payments =
    state.status === "ready"
      ? paymentAvailability(state.catalog.settings)
      : { jazzcash: true, easypaisa: true, bank_transfer: false, cod: true };
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mb-8 text-sm text-muted-foreground">No account needed.</p>
      <CheckoutForm payments={payments} />
    </div>
  );
}
