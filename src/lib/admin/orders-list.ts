/** Filters for Admin > Orders, read from the address bar (?view=&q=&page=). */
export const orderViews = [
  { id: "action", label: "Needs action" },
  { id: "verify", label: "Payments to verify" },
  { id: "pending", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "processing", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
] as const;
export type OrderView = (typeof orderViews)[number]["id"];

export const ORDERS_PER_PAGE = 25;

export type AdminOrdersQuery = { view: OrderView; q: string; page: number };

export function parseAdminOrdersQuery(params: Record<string, string | string[] | undefined>): AdminOrdersQuery {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const view = orderViews.some((v) => v.id === one("view")) ? (one("view") as OrderView) : "action";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(one("page")) || 1)));
  return { view, q: one("q").trim().slice(0, 80), page };
}

export function adminOrdersHref(q: Partial<AdminOrdersQuery>): string {
  const sp = new URLSearchParams();
  if (q.view && q.view !== "action") sp.set("view", q.view);
  if (q.q) sp.set("q", q.q);
  if (q.page && q.page > 1) sp.set("page", String(q.page));
  const s = sp.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

export type OrderSearch =
  | { kind: "none" }
  | { kind: "number"; orderNumber: string }
  | { kind: "phone"; digits: string }
  | { kind: "name"; text: string };

/**
 * Turns the search box into ONE safe filter. Only letters, digits and spaces
 * survive, so nothing typed can change the database query's structure.
 */
export function parseOrderSearch(raw: string): OrderSearch {
  const q = raw.trim();
  if (!q) return { kind: "none" };
  const num = /^(?:DUB-?)?(\d{5,10})$/i.exec(q.replace(/\s+/g, ""));
  if (num && /^dub/i.test(q)) return { kind: "number", orderNumber: `DUB-${num[1]}` };
  const digits = q.replace(/[\s+-]/g, "");
  if (/^\d{4,13}$/.test(digits)) {
    // "92300..." / "0300..." / last digits: match on the part after the leading 0 / 92.
    if (digits.length === 5 && !digits.startsWith("0")) return { kind: "number", orderNumber: `DUB-${digits}` };
    return { kind: "phone", digits: digits.replace(/^92/, "0").replace(/^0/, "") };
  }
  const text = q.replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return text ? { kind: "name", text } : { kind: "none" };
}
