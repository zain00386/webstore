/**
 * The customer's recent order links, kept in THIS browser only (guests have no
 * account). Each entry holds the secret token for that order's page, so the list
 * never leaves the device and is never sent to our server as a list.
 */
export const RECENT_ORDERS_KEY = "dub-orders-v1";
export const MAX_RECENT_ORDERS = 10;

export type RecentOrder = { orderNumber: string; token: string; at: string };

const ORDER_NUMBER = /^DUB-\d{1,10}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Keeps only well-formed entries (storage can be edited by hand), newest first, no duplicates. */
export function sanitizeRecentOrders(value: unknown): RecentOrder[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: RecentOrder[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") continue;
    const { orderNumber, token, at } = v as Record<string, unknown>;
    if (typeof orderNumber !== "string" || !ORDER_NUMBER.test(orderNumber)) continue;
    if (typeof token !== "string" || !TOKEN.test(token)) continue;
    if (seen.has(orderNumber)) continue;
    seen.add(orderNumber);
    const time = typeof at === "string" && !Number.isNaN(Date.parse(at)) ? at : new Date(0).toISOString();
    out.push({ orderNumber, token, at: time });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_RECENT_ORDERS);
}

/** Adds (or moves to the top) one order. */
export function addRecentOrder(list: RecentOrder[], entry: RecentOrder): RecentOrder[] {
  return sanitizeRecentOrders([entry, ...list.filter((o) => o.orderNumber !== entry.orderNumber)]);
}

export function readRecentOrders(): RecentOrder[] {
  try {
    return sanitizeRecentOrders(JSON.parse(window.localStorage.getItem(RECENT_ORDERS_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

/** Saves an order link on this device. `at` is kept if the order is already saved. */
export function rememberOrder(orderNumber: string, token: string): void {
  try {
    const list = readRecentOrders();
    const at = list.find((o) => o.orderNumber === orderNumber)?.at ?? new Date().toISOString();
    window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(addRecentOrder(list, { orderNumber, token, at })));
  } catch {
    // storage blocked: the order link itself still works
  }
}

export function forgetOrder(orderNumber: string): void {
  try {
    const list = readRecentOrders().filter((o) => o.orderNumber !== orderNumber);
    window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(list));
  } catch {
    // nothing to do
  }
}

export function orderPath(o: Pick<RecentOrder, "orderNumber" | "token">): string {
  return `/order-confirmation/${o.orderNumber}?t=${o.token}`;
}
