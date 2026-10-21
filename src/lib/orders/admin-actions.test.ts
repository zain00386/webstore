import { describe, expect, it } from "vitest";
import { allowedActions, orderActionError, orderActionSchema } from "./admin-actions";

const base = { orderId: "00000000-0000-4000-8000-000000000001", expectedUpdatedAt: "2026-10-21T07:00:00.123456+00:00", note: "", shippedVia: "", trackingNumber: "" } as const;

describe("admin order actions", () => {
  it("offers the next step, cancel and note for a new COD order (no 'paid' before delivery)", () => {
    expect(allowedActions({ status: "pending", payment_status: "pending", payment_method: "cod" })).toEqual(["confirm", "cancel", "note"]);
    expect(allowedActions({ status: "shipped", payment_status: "pending", payment_method: "cod" })).toEqual(["deliver", "mark_paid", "note"]);
  });

  it("won't offer shipping for an unpaid prepaid order", () => {
    const unpaid = allowedActions({ status: "processing", payment_status: "pending", payment_method: "jazzcash" });
    expect(unpaid).not.toContain("ship");
    expect(unpaid).toEqual(expect.arrayContaining(["mark_paid", "payment_failed", "cancel"]));
    expect(allowedActions({ status: "processing", payment_status: "paid", payment_method: "jazzcash" })).toContain("ship");
  });

  it("lets a confirmed order skip 'packed'", () => {
    expect(allowedActions({ status: "confirmed", payment_status: "pending", payment_method: "cod" })).toEqual(["pack", "ship", "cancel", "note"]);
  });

  it("cancelled orders: refund only if paid; delivered orders can't be cancelled", () => {
    expect(allowedActions({ status: "cancelled", payment_status: "paid", payment_method: "bank_transfer" })).toEqual(["refund", "note"]);
    expect(allowedActions({ status: "cancelled", payment_status: "pending", payment_method: "cod" })).toEqual(["note"]);
    expect(allowedActions({ status: "delivered", payment_status: "paid", payment_method: "cod" })).toEqual(["note"]);
  });

  it("needs a reason to cancel or refund, and validates tracking numbers", () => {
    expect(orderActionSchema.safeParse({ ...base, action: "cancel" }).success).toBe(false);
    expect(orderActionSchema.safeParse({ ...base, action: "cancel", note: "Customer asked" }).success).toBe(true);
    expect(orderActionSchema.safeParse({ ...base, action: "ship", shippedVia: "TCS", trackingNumber: "<script>" }).success).toBe(false);
    expect(orderActionSchema.safeParse({ ...base, action: "ship", shippedVia: "DHL" }).success).toBe(false);
    expect(orderActionSchema.safeParse({ ...base, action: "ship", shippedVia: "M&P", trackingNumber: "MP-123 456" }).success).toBe(true);
  });

  it("explains database refusals in plain words", () => {
    expect(orderActionError("STALE")).toMatch(/another tab/);
    expect(orderActionError("NOT_PAID")).toMatch(/mark it paid/);
  });
});
