import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDERS_PER_PAGE, parseOrderSearch, type AdminOrdersQuery } from "@/lib/admin/orders-list";
import type { Database, OrderEventRow, OrderItemRow, OrderRow } from "@/lib/supabase/database.types";
import { DataError } from "./queries";

type Db = SupabaseClient<Database>;

const LIST_COLUMNS =
  "id, order_number, created_at, customer_name, customer_phone, city, delivery_method, payment_method, payment_status, status, total";

export type AdminOrderListRow = Pick<
  OrderRow,
  | "id"
  | "order_number"
  | "created_at"
  | "customer_name"
  | "customer_phone"
  | "city"
  | "delivery_method"
  | "payment_method"
  | "payment_status"
  | "status"
  | "total"
>;

/** One page of orders for Admin > Orders. Runs as the signed-in admin (database rules apply). */
export async function fetchAdminOrders(db: Db, query: AdminOrdersQuery): Promise<{ rows: AdminOrderListRow[]; total: number }> {
  let q = db.from("orders").select(LIST_COLUMNS, { count: "exact" });

  switch (query.view) {
    case "action":
      // New orders, plus prepaid orders whose payment still needs checking.
      q = q.or("status.eq.pending,and(payment_method.neq.cod,payment_status.eq.pending,status.neq.cancelled)");
      break;
    case "verify":
      q = q.neq("payment_method", "cod").eq("payment_status", "pending").neq("status", "cancelled");
      break;
    case "all":
      break;
    default:
      q = q.eq("status", query.view);
  }

  // parseOrderSearch keeps only letters, digits and spaces, so these filters are safe.
  const search = parseOrderSearch(query.q);
  if (search.kind === "number") q = q.eq("order_number", search.orderNumber);
  else if (search.kind === "phone") q = q.like("customer_phone", `%${search.digits}%`);
  else if (search.kind === "name") q = q.ilike("customer_name", `%${search.text}%`);

  const from = (query.page - 1) * ORDERS_PER_PAGE;
  const { data, error, count } = await q
    .order("created_at", { ascending: query.view === "action" || query.view === "verify" })
    .order("id")
    .range(from, from + ORDERS_PER_PAGE - 1);
  // Asking for a page past the end gives a "range" error: treat as empty.
  if (error && error.code !== "PGRST103") throw new DataError("orders", error);
  return { rows: (data ?? []).map((r) => ({ ...r, total: Number(r.total) })), total: count ?? 0 };
}

export type AdminOrderDetail = OrderRow & {
  items: Pick<OrderItemRow, "book_id" | "title_snapshot" | "unit_price" | "quantity" | "line_total">[];
  events: Pick<OrderEventRow, "id" | "event" | "from_value" | "to_value" | "note" | "created_at" | "actor_id">[];
};

export async function fetchAdminOrder(db: Db, id: string): Promise<AdminOrderDetail | null> {
  const [orderRes, itemsRes, eventsRes] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("book_id, title_snapshot, unit_price, quantity, line_total").eq("order_id", id).order("title_snapshot"),
    db.from("order_events").select("id, event, from_value, to_value, note, created_at, actor_id").eq("order_id", id).order("id"),
  ]);
  if (orderRes.error) throw new DataError("order", orderRes.error);
  if (!orderRes.data) return null;
  const o = orderRes.data;
  return {
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    total: Number(o.total),
    items: (itemsRes.data ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price), line_total: Number(i.line_total) })),
    events: eventsRes.data ?? [],
  };
}
