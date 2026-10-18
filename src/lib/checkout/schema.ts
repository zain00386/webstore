import { z } from "zod";
import { deliveryMethods, isPaymentAllowed, paymentMethods } from "./rules";

/** Pakistani mobile: 03XXXXXXXXX, +923XXXXXXXXX or 00923XXXXXXXXX (spaces/dashes allowed). */
const PK_MOBILE = /^(?:\+92|0092|92|0)3\d{9}$/;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "");
  if (!PK_MOBILE.test(digits)) return digits;
  return `0${digits.replace(/^(?:\+92|0092|92|0)/, "")}`;
}

/**
 * Checkout form rules. The same schema will validate the order on the
 * server in Phase 8 — the browser check is only for quick feedback.
 */
export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name").max(80, "Name is too long"),
    phone: z
      .string()
      .trim()
      .refine((v) => PK_MOBILE.test(v.replace(/[\s-]/g, "")), "Please enter a valid mobile number, e.g. 0300-1234567")
      .transform(normalizePhone),
    email: z
      .string()
      .trim()
      .max(120)
      .refine((v) => v === "" || z.email().safeParse(v).success, "Please enter a valid email or leave it empty"),
    address: z.string().trim().min(10, "Please enter your full delivery address").max(300, "Address is too long"),
    city: z.string().trim().min(2, "Please enter your city").max(60, "City name is too long"),
    notes: z.string().trim().max(500, "Notes can be up to 500 characters"),
    deliveryMethod: z.enum(deliveryMethods, { message: "Please choose a delivery method" }),
    paymentMethod: z.enum(paymentMethods, { message: "Please choose a payment method" }),
  })
  .refine((v) => isPaymentAllowed(v.deliveryMethod, v.paymentMethod), {
    path: ["paymentMethod"],
    message: "Cash on Delivery is available with TCS / Leopards only",
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
