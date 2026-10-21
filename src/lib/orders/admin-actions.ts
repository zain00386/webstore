import { z } from "zod";
import type { OrderStatus, PaymentMethodDb, PaymentStatus } from "@/lib/supabase/database.types";

/**
 * What an admin can do to an order. The database function admin_update_order
 * enforces these same rules; this copy only decides which buttons to show.
 */
export const orderActions = ["confirm", "pack", "ship", "deliver", "cancel", "mark_paid", "payment_failed", "refund", "note"] as const;
export type OrderAction = (typeof orderActions)[number];

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "New",
  confirmed: "Confirmed",
  processing: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Not paid yet",
  paid: "Paid",
  failed: "Not received",
  refunded: "Refunded",
  not_applicable: "No payment",
};

export const actionLabels: Record<OrderAction, string> = {
  confirm: "Confirm order",
  pack: "Mark packed",
  ship: "Mark shipped",
  deliver: "Mark delivered",
  cancel: "Cancel order",
  mark_paid: "Mark paid",
  payment_failed: "Payment not received",
  refund: "Mark refunded",
  note: "Add note",
};

/** Actions that ask "are you sure?" with a written reason. */
export const needsReason: ReadonlySet<OrderAction> = new Set(["cancel", "refund", "note"]);

type OrderForActions = { status: OrderStatus; payment_status: PaymentStatus; payment_method: PaymentMethodDb };

/** Status step for this order, or null when it's finished / cancelled. */
export function nextStep(o: OrderForActions): OrderAction | null {
  switch (o.status) {
    case "pending":
      return "confirm";
    case "confirmed":
      return "pack";
    case "processing":
      return "ship";
    case "shipped":
      return "deliver";
    default:
      return null;
  }
}

export function isPrepaid(method: PaymentMethodDb): boolean {
  return method !== "cod";
}

/** Why "ship" is blocked, if it is. */
export function shipBlockedReason(o: OrderForActions): string | null {
  if (isPrepaid(o.payment_method) && o.payment_status !== "paid") {
    return "Mark the payment as paid (after checking your account) before shipping.";
  }
  return null;
}

export function allowedActions(o: OrderForActions): OrderAction[] {
  const out: OrderAction[] = [];
  const cancelled = o.status === "cancelled";
  const step = nextStep(o);
  if (step && !(step === "ship" && shipBlockedReason(o))) out.push(step);
  // A confirmed order may skip "packed" and go straight to shipped.
  if (o.status === "confirmed" && !shipBlockedReason(o)) out.push("ship");

  if (!cancelled && (o.payment_status === "pending" || o.payment_status === "failed")) {
    if (isPrepaid(o.payment_method) || o.status === "shipped" || o.status === "delivered") out.push("mark_paid");
  }
  if (!cancelled && isPrepaid(o.payment_method) && o.payment_status === "pending") out.push("payment_failed");
  if (o.status === "pending" || o.status === "confirmed" || o.status === "processing") out.push("cancel");
  if (cancelled && o.payment_status === "paid") out.push("refund");
  out.push("note");
  return out;
}

export const couriers = ["TCS", "Leopards", "M&P", "Pakistan Post"] as const;

export const orderActionSchema = z
  .object({
    orderId: z.uuid(),
    expectedUpdatedAt: z.string().min(10).max(40),
    action: z.enum(orderActions),
    note: z.string().trim().max(500, "At most 500 characters"),
    shippedVia: z.union([z.enum(couriers), z.literal("")]),
    trackingNumber: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[A-Za-z0-9 -]{3,40}$/.test(v), "Letters, numbers, spaces or dashes (3 to 40)"),
  })
  .superRefine((v, ctx) => {
    if (needsReason.has(v.action) && !v.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: v.action === "note" ? "Write the note" : "Please write a reason" });
    }
  });

export type OrderActionInput = z.input<typeof orderActionSchema>;

/** Friendly messages for the database's refusal codes. */
export function orderActionError(message: string): string {
  if (message.includes("STALE")) return "This order was changed in another tab or by another admin. The page now shows the latest; please check and try again.";
  if (message.includes("NOT_PAID")) return "This order is prepaid: mark it paid (after checking your account) before shipping.";
  if (message.includes("INVALID_TRANSITION")) return "That change isn't allowed for this order any more. The page now shows its current state.";
  if (message.includes("REASON_REQUIRED")) return "Please write a reason.";
  if (message.includes("NOT_FOUND")) return "This order no longer exists.";
  if (message.includes("NOT_ADMIN")) return "Only admins can change orders.";
  return "Couldn't update the order. Please try again.";
}
