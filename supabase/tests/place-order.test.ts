// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asOwner, asRole, createTestDb, errorOf } from "./test-db";

let db: PGlite;
const HASH = "b".repeat(64);
const customer = { name: "Ali Khan", phone: "03001234567", email: "", address: "House 12, Street 4, Satellite Town", city: "Rawalpindi", notes: "" };
let pms: string;
let law: string;
let hidden: string;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into public.books (slug, title, price, stock_quantity) values ('pms', 'PMS Guide', 1800, 3), ('law', 'Law Notes', 500, 1);
    insert into public.books (slug, title, price, stock_quantity, is_active) values ('hidden', 'Hidden', 100, 5, false);
  `);
  const ids = await db.query<{ slug: string; id: string }>("select slug, id from public.books");
  pms = ids.rows.find((r) => r.slug === "pms")!.id;
  law = ids.rows.find((r) => r.slug === "law")!.id;
  hidden = ids.rows.find((r) => r.slug === "hidden")!.id;
}, 60_000);

beforeEach(() => asOwner(db));

let keyN = 0;
const newKey = () => `00000000-0000-4000-8000-${String(++keyN).padStart(12, "0")}`;

type Placed = { order_id: string; order_number: string; total: string; created: boolean };
const place = (items: { book_id: string; quantity: number }[], opts: { key?: string; delivery?: string; payment?: string } = {}) =>
  db.query<Placed>("select * from public.place_order($1, $2, $3, $4, $5, $6)", [
    opts.key ?? newKey(),
    HASH,
    JSON.stringify(customer),
    opts.delivery ?? "courier",
    opts.payment ?? "cod",
    JSON.stringify(items),
  ]);
const stock = async (id: string) => (await db.query<{ s: number }>("select stock_quantity s from public.books where id = $1", [id])).rows[0].s;

describe("place_order", () => {
  it("creates the order with database prices, snapshots and the delivery fee, and deducts stock", async () => {
    const r = (await place([{ book_id: pms, quantity: 2 }])).rows[0];
    expect(r.created).toBe(true);
    expect(r.order_number).toMatch(/^DUB-\d+$/);
    expect(r.total).toBe("4150.00"); // 2 x 1800 + 550 courier
    const order = (await db.query<{ subtotal: string; delivery_fee: string; payment_status: string; status: string }>("select * from public.orders where id = $1", [r.order_id])).rows[0];
    expect(order).toMatchObject({ subtotal: "3600.00", delivery_fee: "550.00", payment_status: "pending", status: "pending" });
    const items = (await db.query<{ title_snapshot: string; unit_price: string; quantity: number }>("select * from public.order_items where order_id = $1", [r.order_id])).rows;
    expect(items).toEqual([expect.objectContaining({ title_snapshot: "PMS Guide", unit_price: "1800.00", quantity: 2 })]);
    expect(await stock(pms)).toBe(1);
    const events = (await db.query<{ event: string }>("select event from public.order_events where order_id = $1", [r.order_id])).rows;
    expect(events.map((e) => e.event)).toEqual(["created"]);
  });

  it("uses Rs. 300 for Pakistan Post with JazzCash", async () => {
    const r = (await place([{ book_id: law, quantity: 1 }], { delivery: "pakistan_post", payment: "jazzcash" })).rows[0];
    expect(r.total).toBe("800.00");
    expect(await stock(law)).toBe(0);
  });

  it("refuses more copies than are in stock, saving nothing", async () => {
    const before = await stock(pms);
    const err = await errorOf(place([{ book_id: pms, quantity: before + 1 }]));
    expect(err).toMatch(/CART_CHANGED/);
    expect(await stock(pms)).toBe(before);
  });

  it("the last copy can only be sold once", async () => {
    await db.exec(`update public.books set stock_quantity = 1 where slug = 'pms'`);
    const first = await place([{ book_id: pms, quantity: 1 }]);
    expect(first.rows[0].created).toBe(true);
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }]))).toMatch(/CART_CHANGED/);
    expect(await stock(pms)).toBe(0);
  });

  it("refuses hidden or unknown books", async () => {
    expect(await errorOf(place([{ book_id: hidden, quantity: 1 }]))).toMatch(/CART_CHANGED/);
    expect(await errorOf(place([{ book_id: "00000000-0000-4000-8000-0000000000ff", quantity: 1 }]))).toMatch(/CART_CHANGED/);
  });

  it("is all-or-nothing: one bad book means no order and no stock taken", async () => {
    await db.exec(`update public.books set stock_quantity = 5 where slug = 'pms'`);
    const ordersBefore = (await db.query<{ n: number }>("select count(*)::int n from public.orders")).rows[0].n;
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }, { book_id: hidden, quantity: 1 }]))).toMatch(/CART_CHANGED/);
    expect(await stock(pms)).toBe(5);
    expect((await db.query<{ n: number }>("select count(*)::int n from public.orders")).rows[0].n).toBe(ordersBefore);
  });

  it("a repeated submission returns the same order and doesn't deduct twice", async () => {
    await db.exec(`update public.books set stock_quantity = 5 where slug = 'pms'`);
    const key = newKey();
    const a = (await place([{ book_id: pms, quantity: 2 }], { key })).rows[0];
    const b = (await place([{ book_id: pms, quantity: 2 }], { key })).rows[0];
    expect(b).toMatchObject({ order_id: a.order_id, created: false });
    expect(await stock(pms)).toBe(3);
  });

  it("refuses COD with Pakistan Post, and disabled methods", async () => {
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }], { delivery: "pakistan_post", payment: "cod" }))).toMatch(/PAYMENT_UNAVAILABLE/);
    await db.exec("update public.store_settings set easypaisa_enabled = false");
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }], { payment: "easypaisa" }))).toMatch(/PAYMENT_UNAVAILABLE/);
    await db.exec("update public.store_settings set easypaisa_enabled = true, courier_enabled = false");
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }]))).toMatch(/DELIVERY_UNAVAILABLE/);
    await db.exec("update public.store_settings set courier_enabled = true");
  });

  it("refuses bad item lists", async () => {
    expect(await errorOf(place([]))).toMatch(/INVALID_ITEMS/);
    expect(await errorOf(place([{ book_id: pms, quantity: 0 }]))).toMatch(/INVALID_ITEMS/);
    expect(await errorOf(place([{ book_id: pms, quantity: 21 }]))).toMatch(/INVALID_ITEMS/);
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }, { book_id: pms, quantity: 1 }]))).toMatch(/INVALID_ITEMS/);
  });

  it("can't be called by visitors or signed-in users", async () => {
    await asRole(db, "anon");
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }]))).toMatch(/permission denied/);
    await asRole(db, "authenticated", "00000000-0000-4000-8000-00000000c001");
    expect(await errorOf(place([{ book_id: pms, quantity: 1 }]))).toMatch(/permission denied/);
  });
});
