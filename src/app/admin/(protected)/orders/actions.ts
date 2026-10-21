"use server";

import { refresh } from "next/cache";
import { actionLabels, orderActionError, orderActionSchema } from "@/lib/orders/admin-actions";
import { requireAdmin } from "@/lib/auth/admin";
import { refreshShop } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type OrderActionState = { ok?: string; error?: string; fieldErrors?: Record<string, string>; attempt?: number };

/**
 * Runs one admin action on an order. All the rules (allowed steps, prepaid must
 * be paid before shipping, stock restored once) live in the database function,
 * which also checks the caller is an admin.
 */
export async function updateOrder(_prev: OrderActionState, fd: FormData): Promise<OrderActionState> {
  await requireAdmin();
  const parsed = orderActionSchema.safeParse({
    orderId: String(fd.get("orderId") ?? ""),
    expectedUpdatedAt: String(fd.get("expectedUpdatedAt") ?? ""),
    action: String(fd.get("action") ?? ""),
    note: String(fd.get("note") ?? ""),
    shippedVia: String(fd.get("shippedVia") ?? ""),
    trackingNumber: String(fd.get("trackingNumber") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { error: Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors, attempt: Date.now() };
  }
  const v = parsed.data;

  const db = await createSessionClient();
  const { error } = await db.rpc("admin_update_order", {
    p_order_id: v.orderId,
    p_expected_updated_at: v.expectedUpdatedAt,
    p_action: v.action,
    p_note: v.note || null,
    p_shipped_via: v.shippedVia || null,
    p_tracking_number: v.trackingNumber || null,
  });
  if (error) {
    if (!/STALE|NOT_PAID|INVALID_TRANSITION|REASON_REQUIRED|NOT_FOUND/.test(error.message)) {
      console.error("admin_update_order failed", error.code);
    }
    refresh(); // show the order's current state
    return { error: orderActionError(error.message), attempt: Date.now() };
  }

  if (v.action === "cancel") refreshShop(); // stock went back: the shop shows it at once
  else refresh();
  return { ok: `${actionLabels[v.action]}: done.`, attempt: Date.now() };
}
