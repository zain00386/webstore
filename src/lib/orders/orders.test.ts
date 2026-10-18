import { describe, expect, it } from "vitest";
import { placeOrderErrorResult, placeOrderSchema } from "./place-order";
import { createOrderToken, hashOrderToken, tokenMatches } from "./token";

describe("order tokens", () => {
  it("creates long random tokens and stores only a hash", () => {
    const a = createOrderToken();
    const b = createOrderToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashOrderToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  it("accepts only the right token", () => {
    const { token, hash } = createOrderToken();
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(createOrderToken().token, hash)).toBe(false);
    expect(tokenMatches("", hash)).toBe(false);
    expect(tokenMatches("x".repeat(43) + "'; drop", hash)).toBe(false);
    expect(tokenMatches(token, "not-a-hash")).toBe(false);
  });
});

const details = {
  name: "Ali Khan",
  phone: "0300-1234567",
  email: "",
  address: "House 12, Street 4, Satellite Town",
  city: "Rawalpindi",
  notes: "",
  deliveryMethod: "courier",
  paymentMethod: "cod",
};
const item = { bookId: "00000000-0000-4000-8000-000000000001", quantity: 2 };

describe("placeOrderSchema", () => {
  it("accepts a valid order and ignores any price the browser sends", () => {
    const parsed = placeOrderSchema.parse({
      idempotencyKey: "00000000-0000-4000-8000-0000000000aa",
      accessToken: "a".repeat(43),
      details,
      items: [{ ...item, price: 1 }],
    });
    expect(parsed.items[0]).toEqual(item); // "price" is stripped
    expect(parsed.details.phone).toBe("03001234567");
  });

  it("rejects bad quantities, empty carts, COD with Pakistan Post and missing keys", () => {
    const base = { idempotencyKey: "00000000-0000-4000-8000-0000000000aa", accessToken: "a".repeat(43), details, items: [item] };
    expect(placeOrderSchema.safeParse({ ...base, accessToken: "short" }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, items: [{ ...item, quantity: 0 }] }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, items: [{ ...item, quantity: 1.5 }] }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, details: { ...details, deliveryMethod: "pakistan_post" } }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...base, idempotencyKey: "abc" }).success).toBe(false);
  });
});

describe("placeOrderErrorResult", () => {
  it("explains a cart that changed and lists the problem books", () => {
    const r = placeOrderErrorResult({
      message: "CART_CHANGED",
      details: JSON.stringify([{ book_id: item.bookId, reason: "stock", available: 1 }]),
    });
    expect(r).toMatchObject({ ok: false, cartChanged: [{ bookId: item.bookId, reason: "stock", available: 1 }] });
  });

  it("gives clear messages for other failures without leaking internals", () => {
    expect(placeOrderErrorResult({ message: "PAYMENT_UNAVAILABLE" })).toMatchObject({ error: expect.stringContaining("payment method") });
    const unknown = placeOrderErrorResult({ message: 'relation "orders" secret internal detail' });
    expect(unknown).toMatchObject({ ok: false });
    expect(JSON.stringify(unknown)).not.toContain("secret internal detail");
  });
});
