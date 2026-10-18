import { z } from "zod";
import { checkoutSchema } from "@/lib/checkout/schema";

/** Everything the browser sends to place an order. Prices are deliberately NOT part of it. */
export const placeOrderSchema = z.object({
  idempotencyKey: z.uuid(),
  /** Random secret made by the customer's browser for their order link (only its hash is stored). */
  accessToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid order token"),
  details: checkoutSchema,
  items: z
    .array(z.object({ bookId: z.uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty")
    .max(50, "Too many different books in one order"),
});

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export type CartProblem = { bookId: string; reason: "unavailable" | "stock"; available: number };

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; token: string; total: number }
  | { ok: false; error: string; cartChanged?: CartProblem[]; fieldErrors?: Record<string, string> };

/** Turns a place_order database error into a customer-friendly result. */
export function placeOrderErrorResult(error: { message: string; details?: string | null }): PlaceOrderResult {
  const msg = error.message ?? "";
  if (msg.includes("CART_CHANGED")) {
    let problems: CartProblem[] = [];
    try {
      problems = (JSON.parse(error.details ?? "[]") as { book_id: string; reason: CartProblem["reason"]; available: number }[]).map((p) => ({
        bookId: p.book_id,
        reason: p.reason,
        available: p.available,
      }));
    } catch {
      // details missing or malformed: still tell the customer to review the cart
    }
    return {
      ok: false,
      error: "Some books in your cart just sold out or changed. We've updated your cart; please check it and try again.",
      cartChanged: problems,
    };
  }
  if (msg.includes("PAYMENT_UNAVAILABLE")) {
    return { ok: false, error: "That payment method isn't available for this delivery option. Please choose another." };
  }
  if (msg.includes("DELIVERY_UNAVAILABLE")) {
    return { ok: false, error: "That delivery option isn't available right now. Please choose another." };
  }
  if (msg.includes("INVALID_ITEMS")) return { ok: false, error: "Your cart has an invalid item. Please review your cart." };
  if (/violates check constraint/.test(msg)) return { ok: false, error: "Some of your details aren't valid. Please check them and try again." };
  return { ok: false, error: "We couldn't place your order. Please try again, or WhatsApp us on 0324-9574895." };
}
