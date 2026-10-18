import "server-only";
import { tokenMatches } from "@/lib/orders/token";
import { createServiceClient } from "@/lib/supabase/server";

export const ORDER_NUMBER = /^DUB-\d{1,10}$/;

export type CustomerOrder = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "jazzcash" | "easypaisa" | "cod";
  deliveryMethod: "pakistan_post" | "courier";
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  notes: string | null;
  items: { title: string; unitPrice: number; quantity: number; lineTotal: number }[];
};

export type PaymentDetails = {
  jazzcash: { title: string | null; number: string | null } | null;
  easypaisa: { title: string | null; number: string | null } | null;
  instructions: string;
  whatsapp: string;
};

/**
 * A guest's own order, ONLY if their secret token matches. Wrong token and
 * unknown number both return null, so the page can't be used to probe orders.
 */
export async function fetchOrderForCustomer(orderNumber: string, token: string): Promise<CustomerOrder | null> {
  if (!ORDER_NUMBER.test(orderNumber) || !token) return null;
  const db = createServiceClient();
  const { data: o } = await db
    .from("orders")
    .select(
      "id, order_number, created_at, status, payment_status, payment_method, delivery_method, subtotal, delivery_fee, total, customer_name, customer_phone, address, city, notes, access_token_hash",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!o || !tokenMatches(token, o.access_token_hash)) return null;
  const { data: items } = await db
    .from("order_items")
    .select("title_snapshot, unit_price, quantity, line_total")
    .eq("order_id", o.id)
    .order("title_snapshot");
  return {
    orderNumber: o.order_number,
    createdAt: o.created_at,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    deliveryMethod: o.delivery_method,
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    address: o.address,
    city: o.city,
    notes: o.notes,
    items: (items ?? []).map((i) => ({
      title: i.title_snapshot,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
  };
}

/** Account details for paying by JazzCash/Easypaisa: shown only on the customer's own order page. */
export async function fetchPaymentDetails(): Promise<PaymentDetails> {
  const db = createServiceClient();
  const { data: s } = await db
    .from("store_settings")
    .select(
      "jazzcash_enabled, jazzcash_account_title, jazzcash_number, easypaisa_enabled, easypaisa_account_title, easypaisa_number, payment_instructions, whatsapp_e164",
    )
    .eq("id", true)
    .single();
  return {
    jazzcash: s?.jazzcash_enabled ? { title: s.jazzcash_account_title, number: s.jazzcash_number } : null,
    easypaisa: s?.easypaisa_enabled ? { title: s.easypaisa_account_title, number: s.easypaisa_number } : null,
    instructions: s?.payment_instructions ?? "",
    whatsapp: s?.whatsapp_e164 ?? "923249574895",
  };
}
