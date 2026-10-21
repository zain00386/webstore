import { describe, expect, it } from "vitest";
import { addRecentOrder, MAX_RECENT_ORDERS, orderPath, sanitizeRecentOrders } from "./recent-orders";

const token = "a".repeat(43);

describe("recent orders on this device", () => {
  it("drops malformed entries and duplicates, newest first", () => {
    const list = sanitizeRecentOrders([
      { orderNumber: "DUB-10001", token, at: "2026-10-01T10:00:00Z" },
      { orderNumber: "DUB-10002", token, at: "2026-10-02T10:00:00Z" },
      { orderNumber: "DUB-10001", token, at: "2026-10-03T10:00:00Z" },
      { orderNumber: "<script>", token, at: "2026-10-04T10:00:00Z" },
      { orderNumber: "DUB-10003", token: "short", at: "2026-10-04T10:00:00Z" },
      null,
      "junk",
    ]);
    expect(list.map((o) => o.orderNumber)).toEqual(["DUB-10002", "DUB-10001"]);
    expect(sanitizeRecentOrders("not a list")).toEqual([]);
  });

  it("adds to the top and keeps at most 10", () => {
    let list = sanitizeRecentOrders([]);
    for (let n = 1; n <= 12; n++) {
      list = addRecentOrder(list, { orderNumber: `DUB-${10000 + n}`, token, at: new Date(2026, 9, n).toISOString() });
    }
    expect(list).toHaveLength(MAX_RECENT_ORDERS);
    expect(list[0].orderNumber).toBe("DUB-10012");
  });

  it("builds the private order link", () => {
    expect(orderPath({ orderNumber: "DUB-10001", token })).toBe(`/order-confirmation/DUB-10001?t=${token}`);
  });
});
