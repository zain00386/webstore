import { describe, expect, it } from "vitest";
import { addItem, itemCount, MAX_PER_LINE, removeItem, sanitizeStoredCart, setQuantity, subtotal } from "./cart";

const pms = { slug: "pms", title: "PMS Guide", publisher: "Dogar", coverUrl: null, price: 1800, compareAtPrice: 2500, maxQuantity: 5 };
const issb = { ...pms, slug: "issb", title: "ISSB", price: 800, compareAtPrice: null, maxQuantity: 10 };

describe("cart", () => {
  it("adds new items and merges repeats", () => {
    let cart = addItem([], pms, 2);
    cart = addItem(cart, pms, 1);
    cart = addItem(cart, issb);
    expect(cart.map((l) => [l.slug, l.quantity])).toEqual([["pms", 3], ["issb", 1]]);
    expect(itemCount(cart)).toBe(4);
    expect(subtotal(cart)).toBe(3 * 1800 + 800);
  });

  it("never exceeds known stock or the per-book ceiling", () => {
    expect(addItem([], pms, 99)[0].quantity).toBe(5);
    expect(addItem([], { ...issb, maxQuantity: 500 }, 99)[0].quantity).toBe(MAX_PER_LINE);
  });

  it("does not add out-of-stock books", () => {
    expect(addItem([], { ...pms, maxQuantity: 0 })).toEqual([]);
  });

  it("sets, clamps and removes quantities", () => {
    const cart = addItem([], pms, 1);
    expect(setQuantity(cart, "pms", 4)[0].quantity).toBe(4);
    expect(setQuantity(cart, "pms", 50)[0].quantity).toBe(5);
    expect(setQuantity(cart, "pms", 0)).toEqual([]);
    expect(removeItem(cart, "pms")).toEqual([]);
  });

  it("sanitizes tampered storage data", () => {
    const stored = [
      { ...pms, quantity: 2 },
      { slug: "bad", title: 1 },
      { ...issb, quantity: -3 },
      { ...issb, slug: "free", price: -100, quantity: 1 },
      "junk",
    ];
    expect(sanitizeStoredCart(stored).map((l) => l.slug)).toEqual(["pms"]);
    expect(sanitizeStoredCart({ not: "an array" })).toEqual([]);
  });
});
