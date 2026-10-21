import { deliveryOptions } from "@/config/site";

export const deliveryMethods = ["pakistan_post", "courier"] as const;
export type DeliveryMethod = (typeof deliveryMethods)[number];

export const paymentMethods = ["jazzcash", "easypaisa", "bank_transfer", "cod"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentLabels: Record<PaymentMethod, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank_transfer: "Bank transfer",
  cod: "Cash on Delivery",
};

/** Delivery charge in PKR. Phase 12 moves these numbers into Admin > Settings. */
export function deliveryCharge(method: DeliveryMethod): number {
  const option = deliveryOptions.find((o) => o.id === method);
  if (!option) throw new Error(`Unknown delivery method: ${method}`);
  return option.charge;
}

/** Cash on Delivery only with TCS / Leopards / M&P; Pakistan Post is prepaid only. */
export function isPaymentAllowed(delivery: DeliveryMethod, payment: PaymentMethod): boolean {
  if (payment !== "cod") return true;
  return deliveryOptions.find((o) => o.id === delivery)?.codAllowed ?? false;
}

/** Which payment methods the owner has switched on (from the public store settings). */
export type PaymentAvailability = Record<PaymentMethod, boolean>;

export function paymentAvailability(s: {
  jazzcash_enabled: boolean;
  easypaisa_enabled: boolean;
  bank_enabled: boolean;
  cod_enabled: boolean;
}): PaymentAvailability {
  return { jazzcash: s.jazzcash_enabled, easypaisa: s.easypaisa_enabled, bank_transfer: s.bank_enabled, cod: s.cod_enabled };
}

/** First switched-on method that works with this delivery (used when the current choice stops being valid). */
export function firstAllowedPayment(delivery: DeliveryMethod, available: PaymentAvailability): PaymentMethod | null {
  return paymentMethods.find((m) => available[m] && isPaymentAllowed(delivery, m)) ?? null;
}

export function orderTotal(itemsSubtotal: number, delivery: DeliveryMethod): number {
  return itemsSubtotal + deliveryCharge(delivery);
}
