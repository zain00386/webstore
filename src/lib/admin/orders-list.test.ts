import { describe, expect, it } from "vitest";
import { adminOrdersHref, parseAdminOrdersQuery, parseOrderSearch } from "./orders-list";

describe("admin orders list", () => {
  it("reads filters safely from the address bar", () => {
    expect(parseAdminOrdersQuery({})).toEqual({ view: "action", q: "", page: 1 });
    expect(parseAdminOrdersQuery({ view: "shipped", page: "3", q: " ali " })).toEqual({ view: "shipped", q: "ali", page: 3 });
    expect(parseAdminOrdersQuery({ view: "drop table", page: "-4" })).toEqual({ view: "action", q: "", page: 1 });
  });

  it("builds links without default values", () => {
    expect(adminOrdersHref({ view: "action" })).toBe("/admin/orders");
    expect(adminOrdersHref({ view: "all", q: "Ali Khan", page: 2 })).toBe("/admin/orders?view=all&q=Ali+Khan&page=2");
  });

  it("recognises order numbers, phone numbers and names", () => {
    expect(parseOrderSearch("DUB-10023")).toEqual({ kind: "number", orderNumber: "DUB-10023" });
    expect(parseOrderSearch("dub10023")).toEqual({ kind: "number", orderNumber: "DUB-10023" });
    expect(parseOrderSearch("10023")).toEqual({ kind: "number", orderNumber: "DUB-10023" });
    expect(parseOrderSearch("0300-1234567")).toEqual({ kind: "phone", digits: "3001234567" });
    expect(parseOrderSearch("+92 300 1234567")).toEqual({ kind: "phone", digits: "3001234567" });
    expect(parseOrderSearch("4567")).toEqual({ kind: "phone", digits: "4567" });
    expect(parseOrderSearch("Ali Khan")).toEqual({ kind: "name", text: "Ali Khan" });
  });

  it("strips characters that could change the query", () => {
    expect(parseOrderSearch("ali),status.eq.paid,(name.ilike.*")).toEqual({ kind: "name", text: "ali status eq paid name ilike" });
    expect(parseOrderSearch("%%%")).toEqual({ kind: "none" });
  });
});
