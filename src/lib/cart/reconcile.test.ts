import { describe, expect, it } from "vitest";
import { sanitizeStoredCart, subtotal, type CartLine } from "./cart";
import { cartRefs, hasBlockingLines, reconcileCart, type ServerBook } from "./reconcile";

const ID1 = "00000000-0000-4000-8000-000000000001";
const ID2 = "00000000-0000-4000-8000-000000000002";

const line = (over: Partial<CartLine>): CartLine => ({
  bookId: ID1,
  slug: "pms-guide",
  title: "PMS Guide",
  publisher: "Dogar",
  coverUrl: null,
  price: 1800,
  compareAtPrice: null,
  maxQuantity: 10,
  quantity: 2,
  ...over,
});

const server = (over: Partial<ServerBook>): ServerBook => ({
  id: ID1,
  slug: "pms-guide",
  title: "PMS Guide",
  publisher: "Dogar",
  coverUrl: null,
  price: 1800,
  compareAtPrice: null,
  stockQuantity: 10,
  ...over,
});

describe("reconcileCart", () => {
  it("leaves an up-to-date cart alone", () => {
    const r = reconcileCart([line({})], [server({})]);
    expect(r.issues).toEqual([]);
    expect(r.lines[0]).toMatchObject({ quantity: 2, price: 1800 });
    expect(hasBlockingLines(r.lines)).toBe(false);
  });

  it("uses the server price, never the browser's (tampered or old)", () => {
    const r = reconcileCart([line({ price: 1 })], [server({ price: 1800 })]);
    expect(r.lines[0].price).toBe(1800);
    expect(r.issues).toEqual([{ kind: "price", title: "PMS Guide", from: 1, to: 1800 }]);
  });

  it("reduces quantity to what's in stock", () => {
    const r = reconcileCart([line({ quantity: 5 })], [server({ stockQuantity: 2 })]);
    expect(r.lines[0]).toMatchObject({ quantity: 2, maxQuantity: 2 });
    expect(r.issues).toEqual([{ kind: "reduced", title: "PMS Guide", from: 5, to: 2 }]);
  });

  it("flags out-of-stock and hidden/deleted books and blocks checkout", () => {
    const r = reconcileCart(
      [line({}), line({ bookId: ID2, slug: "gone", title: "Gone Book" })],
      [server({ stockQuantity: 0 })],
    );
    expect(r.lines.map((l) => l.status)).toEqual(["out_of_stock", "unavailable"]);
    expect(r.issues.map((i) => i.kind)).toEqual(["out_of_stock", "unavailable"]);
    expect(hasBlockingLines(r.lines)).toBe(true);
    expect(subtotal(r.lines)).toBe(0); // blocked lines are not charged
  });

  it("clears the flag when a book comes back in stock", () => {
    const r = reconcileCart([line({ status: "out_of_stock" })], [server({ stockQuantity: 4 })]);
    expect(r.lines[0].status).toBeUndefined();
    expect(hasBlockingLines(r.lines)).toBe(false);
  });

  it("follows a book whose web address changed (matched by id)", () => {
    const r = reconcileCart([line({ slug: "old-address" })], [server({ slug: "new-address", title: "PMS Guide 2026" })]);
    expect(r.lines[0]).toMatchObject({ slug: "new-address", title: "PMS Guide 2026" });
    expect(r.issues).toEqual([]);
  });

  it("matches old carts without an id by slug, and merges duplicates", () => {
    const r = reconcileCart([line({ bookId: undefined }), line({ slug: "pms-guide-new" })], [server({})]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].bookId).toBe(ID1);
  });

  it("reports an issue only once (not again on every check)", () => {
    const first = reconcileCart([line({})], [server({ stockQuantity: 0 })]);
    const second = reconcileCart(first.lines, [server({ stockQuantity: 0 })]);
    expect(second.issues).toEqual([]);
    expect(second.lines[0].status).toBe("out_of_stock");
  });

  it("sends only ids and slugs to the server, never prices", () => {
    expect(cartRefs([line({ price: 1 })])).toEqual([{ id: ID1, slug: "pms-guide" }]);
  });

  it("keeps flagged books visible after a page reload (they have 0 copies available)", () => {
    const { lines } = reconcileCart([line({ quantity: 2 })], [server({ stockQuantity: 0 })]);
    expect(lines[0]).toMatchObject({ status: "out_of_stock", maxQuantity: 0 });
    const reloaded = sanitizeStoredCart(JSON.parse(JSON.stringify(lines)));
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]).toMatchObject({ status: "out_of_stock", quantity: 2 });
    const hidden = reconcileCart([line({})], []).lines;
    expect(sanitizeStoredCart(JSON.parse(JSON.stringify(hidden)))[0].status).toBe("unavailable");
  });

  it("keeps id and status through browser storage, dropping junk", () => {
    const stored = sanitizeStoredCart([{ ...line({ status: "out_of_stock" }) }, { ...line({ bookId: "not-a-uuid", status: "hacked" as never }) }]);
    expect(stored[0]).toMatchObject({ bookId: ID1, status: "out_of_stock" });
    expect(stored[1].bookId).toBeUndefined();
    expect(stored[1].status).toBeUndefined();
  });
});
