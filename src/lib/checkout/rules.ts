import { deliveryOptions } from "@/config/site";

export const deliveryMethods = ["pakistan_post", "courier"] as const;
export type DeliveryMethod = (typeof deliveryMethods)[number];

export const paymentMethods = ["jazzcash", "easypaisa", "cod"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentLabels: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  cod: "Cash on Delivery",
};

/** Delivery charge in PKR. Phase 12 moves these numbers into Admin > Settings. */
export function deliveryCharge(method: DeliveryMethod): number {
  const option = deliveryOptions.find((o) => o.id === method);
  if (!option) throw new Error(`Unknown delivery method: ${method}`);
  return option.charge;
}

/** Cash on Delivery only with TCS / Leopards; Pakistan Post is prepaid only. */
export function isPaymentAllowed(delivery: DeliveryMethod, payment: PaymentMethod): boolean {
  if (payment !== "cod") return true;
  return deliveryOptions.find((o) => o.id === delivery)?.codAllowed ?? false;
}

export function orderTotal(itemsSubtotal: number, delivery: DeliveryMethod): number {
  return itemsSubtotal + deliveryCharge(delivery);
}
