// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ID, asOwner, asRole, createTestDb, CUSTOMER_ID, errorOf } from "./test-db";

let db: PGlite;
let book: string;
const customer = { name: "Ali Khan", phone: "03001234567", email: "", address: "House 12, Street 4, Satellite Town", city: "Rawalpindi", notes: "" };

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN_ID}', 'owner@example.com'), ('${CUSTOMER_ID}', 'someone@example.com');
    insert into public.admin_users (user_id) values ('${ADMIN_ID}');
    insert into public.books (slug, title, price, stock_quantity) values ('pms', 'PMS Guide', 1000, 100);
  `);
  book = (await db.query<{ id: string }>("select id from public.books where slug = 'pms'")).rows[0].id;
}, 60_000);

beforeEach(() => asOwner(db));

let keyN = 0;
/** Places an order (as the website server would) and returns its id. */
async function newOrder(payment = "cod", delivery = "courier", quantity = 2) {
  await asOwner(db);
  const key = `00000000-0000-4000-8000-${String(++keyN).padStart(12, "0")}`;
  const r = await db.query<{ order_id: string }>("select * from public.place_order($1, $2, $3, $4, $5, $6)", [
    key,
    "c".repeat(64),
    JSON.stringify(customer),
    delivery,
    payment,
    JSON.stringify([{ book_id: book, quantity }]),
  ]);
  return r.rows[0].order_id;
}

type OrderState = { status: string; payment_status: string; updated_at: string; stock_restored_at: string | null; paid_verified_by: string | null; tracking_number: string | null };
async function order(id: string): Promise<OrderState> {
  await asOwner(db);
  return (await db.query<OrderState>("select status, payment_status, updated_at::text, stock_restored_at, paid_verified_by, tracking_number from public.orders where id = $1", [id])).rows[0];
}
const stock = async () => {
  await asOwner(db);
  return (await db.query<{ s: number }>("select stock_quantity s from public.books where id = $1", [book])).rows[0].s;
};

/** Runs an admin action with the order's current updated_at (like the admin page does). */
async function act(id: string, action: string, opts: { note?: string; via?: string; tracking?: string; as?: string; stale?: string } = {}) {
  const expected = opts.stale ?? (await order(id)).updated_at;
  await asRole(db, "authenticated", opts.as ?? ADMIN_ID);
  try {
    return await db.query("select public.admin_update_order($1, $2, $3, $4, $5, $6) as updated", [
      id,
      expected,
      action,
      opts.note ?? null,
      opts.via ?? null,
      opts.tracking ?? null,
    ]);
  } finally {
    await asOwner(db);
  }
}

describe("admin_update_order", () => {
  it("walks a COD order through every step, then records cash received", async () => {
    const id = await newOrder();
    expect(await errorOf(act(id, "mark_paid"))).toMatch(/INVALID_TRANSITION/); // no cash before the courier has it
    for (const [action, status] of [["confirm", "confirmed"], ["pack", "processing"], ["ship", "shipped"], ["deliver", "delivered"]] as const) {
      await act(id, action, action === "ship" ? { via: "TCS", tracking: "TCS 123456789" } : {});
      expect((await order(id)).status).toBe(status);
    }
    const o = await order(id);
    expect(o.payment_status).toBe("pending"); // status steps never touch payment
    expect(o.tracking_number).toBe("TCS 123456789");
    await act(id, "mark_paid");
    expect(await order(id)).toMatchObject({ payment_status: "paid", paid_verified_by: ADMIN_ID });
    const events = (await db.query<{ event: string; actor_id: string }>("select event, actor_id from public.order_events where order_id = $1 order by id", [id])).rows;
    expect(events.map((e) => e.event)).toEqual(["created", "confirm", "pack", "ship", "deliver", "mark_paid"]);
    expect(events.slice(1).every((e) => e.actor_id === ADMIN_ID)).toBe(true);
  });

  it("refuses skipped or backwards steps", async () => {
    const id = await newOrder();
    expect(await errorOf(act(id, "deliver"))).toMatch(/INVALID_TRANSITION/);
    expect(await errorOf(act(id, "pack"))).toMatch(/INVALID_TRANSITION/);
    await act(id, "confirm");
    expect(await errorOf(act(id, "confirm"))).toMatch(/INVALID_TRANSITION/);
    expect(await errorOf(act(id, "fly"))).toMatch(/UNKNOWN_ACTION/);
  });

  it("won't ship a JazzCash order until it is marked paid", async () => {
    const id = await newOrder("jazzcash", "pakistan_post");
    await act(id, "confirm");
    expect(await errorOf(act(id, "ship"))).toMatch(/NOT_PAID/);
    await act(id, "mark_paid");
    await act(id, "ship");
    expect(await order(id)).toMatchObject({ status: "shipped", payment_status: "paid" });
  });

  it("can mark a transfer as not received, then paid later", async () => {
    const id = await newOrder("easypaisa", "pakistan_post");
    await act(id, "payment_failed");
    expect((await order(id)).payment_status).toBe("failed");
    await act(id, "mark_paid");
    expect((await order(id)).payment_status).toBe("paid");
  });

  it("cancelling needs a reason and puts stock back exactly once", async () => {
    const before = await stock();
    const id = await newOrder("cod", "courier", 3);
    expect(await stock()).toBe(before - 3);
    expect(await errorOf(act(id, "cancel"))).toMatch(/REASON_REQUIRED/);
    await act(id, "cancel", { note: "Customer asked to cancel" });
    expect(await stock()).toBe(before);
    const o = await order(id);
    expect(o.status).toBe("cancelled");
    expect(o.stock_restored_at).not.toBeNull();
    // a second cancel (double-click, second tab) is refused and adds nothing
    expect(await errorOf(act(id, "cancel", { note: "again" }))).toMatch(/INVALID_TRANSITION/);
    expect(await stock()).toBe(before);
  });

  it("can't cancel once shipped", async () => {
    const id = await newOrder();
    await act(id, "confirm");
    await act(id, "ship");
    expect(await errorOf(act(id, "cancel", { note: "too late" }))).toMatch(/INVALID_TRANSITION/);
  });

  it("refunds only paid, cancelled orders, with a reason", async () => {
    const id = await newOrder("jazzcash", "pakistan_post");
    await act(id, "mark_paid");
    expect(await errorOf(act(id, "refund", { note: "x" }))).toMatch(/INVALID_TRANSITION/);
    await act(id, "cancel", { note: "Out of print" });
    expect((await order(id)).payment_status).toBe("paid"); // cancelling never changes payment by itself
    expect(await errorOf(act(id, "refund"))).toMatch(/REASON_REQUIRED/);
    await act(id, "refund", { note: "Sent back by JazzCash" });
    expect((await order(id)).payment_status).toBe("refunded");
  });

  it("refuses a stale change (someone else changed the order first)", async () => {
    const id = await newOrder();
    const old = (await order(id)).updated_at;
    await act(id, "confirm");
    expect(await errorOf(act(id, "cancel", { note: "x", stale: old }))).toMatch(/STALE/);
    expect((await order(id)).status).toBe("confirmed");
  });

  it("is admin-only, and nobody can edit order rows directly", async () => {
    const id = await newOrder();
    expect(await errorOf(act(id, "confirm", { as: CUSTOMER_ID }))).toMatch(/NOT_ADMIN/);
    await asRole(db, "anon");
    expect(await errorOf(db.query("select public.admin_update_order($1, now(), 'confirm')", [id]))).toMatch(/permission denied/);
    await asRole(db, "authenticated", ADMIN_ID);
    expect(await errorOf(db.query("update public.orders set total = 1, status = 'delivered' where id = $1", [id]))).toMatch(/permission denied/);
    await asOwner(db);
    expect((await order(id)).status).toBe("pending");
  });

  it("adds a private note to the history without changing anything", async () => {
    const id = await newOrder();
    await act(id, "note", { note: "Customer will collect from shop" });
    expect(await order(id)).toMatchObject({ status: "pending", payment_status: "pending" });
    const last = (await db.query<{ note: string }>("select note from public.order_events where order_id = $1 order by id desc limit 1", [id])).rows[0];
    expect(last.note).toBe("Customer will collect from shop");
  });
});
