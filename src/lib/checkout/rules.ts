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

/**
 * Cash on Delivery only with the courier (TCS / Leopards / M&P); Pakistan Post is
 * prepaid only. Whether COD is switched on at all comes from Admin > Settings.
 */
export function isPaymentAllowed(delivery: DeliveryMethod, payment: PaymentMethod): boolean {
  return payment !== "cod" || delivery === "courier";
}

/** Which payment methods the owner has switched on (from the public store settings). */
export type PaymentAvailability = Record<PaymentMethod, boolean>;

/** First switched-on method that works with this delivery (used when the current choice stops being valid). */
export function firstAllowedPayment(delivery: DeliveryMethod, available: PaymentAvailability): PaymentMethod | null {
  return paymentMethods.find((m) => available[m] && isPaymentAllowed(delivery, m)) ?? null;
}
