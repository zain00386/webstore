"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createSharedRateLimiter } from "@/lib/auth/shared-rate-limit";
import { placeOrderErrorResult, placeOrderSchema, type PlaceOrderResult } from "@/lib/orders/place-order";
import { hashOrderToken } from "@/lib/orders/token";
import { orderPath } from "@/lib/orders/recent-orders";
import { siteUrl } from "@/lib/site-url";
import { notifyOrderPlaced } from "@/lib/notifications/order-placed";
import { refreshShop } from "@/lib/db/refresh-shop";
import { createServiceClient } from "@/lib/supabase/server";

// Stops one person tying up stock with lots of fake orders (shared by all servers).
const perDevice = createSharedRateLimiter({ bucket: "order_device", limit: 10, windowMs: 60 * 60_000 });
const perPhone = createSharedRateLimiter({ bucket: "order_phone", limit: 5, windowMs: 60 * 60_000 });

/**
 * Places a real order. The database function re-reads prices and stock, takes
 * the delivery fee from settings, and deducts stock in one locked transaction.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path.at(-1) ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check your details and try again.", fieldErrors };
  }
  const { idempotencyKey, accessToken, details, items } = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const [device, phoneLimit] = await Promise.all([perDevice.check(ip), perPhone.check(details.phone)]);
  if (!device.allowed || !phoneLimit.allowed) {
    return { ok: false, error: "Too many orders in a short time. Please WhatsApp us on 0324-9574895 and we'll help." };
  }

  // Server-only key: place_order can't be called from a browser at all.
  const db = createServiceClient();
  const { data, error } = await db.rpc("place_order", {
    p_idempotency_key: idempotencyKey,
    p_access_token_hash: hashOrderToken(accessToken),
    p_customer: {
      name: details.name,
      phone: details.phone,
      email: details.email,
      address: details.address,
      city: details.city,
      notes: details.notes,
    },
    p_delivery_method: details.deliveryMethod,
    p_payment_method: details.paymentMethod,
    p_items: items.map((i) => ({ book_id: i.bookId, quantity: i.quantity })),
  });

  if (error) {
    if (!/CART_CHANGED|PAYMENT_UNAVAILABLE|DELIVERY_UNAVAILABLE|INVALID_ITEMS/.test(error.message)) {
      console.error("place_order failed", error.code); // no customer details in logs
    }
    return placeOrderErrorResult(error);
  }
  const row = data?.[0];
  if (!row) return { ok: false, error: "We couldn't place your order. Please try again." };

  if (row.created) {
    await Promise.all([perDevice.fail(ip), perPhone.fail(details.phone)]);
    refreshShop(); // stock changed: the shop shows it on the next request
    const notice = {
      orderNumber: row.order_number,
      total: Number(row.total),
      paymentMethod: details.paymentMethod,
      deliveryMethod: details.deliveryMethod,
      customerName: details.name,
      customerPhone: details.phone,
      customerEmail: details.email || null,
      orderUrl: siteUrl() + orderPath({ orderNumber: row.order_number, token: accessToken }),
    };
    after(() => notifyOrderPlaced(notice)); // runs after the reply: a slow service never delays the order
  }
  return { ok: true, orderNumber: row.order_number, token: accessToken, total: Number(row.total) };
}
