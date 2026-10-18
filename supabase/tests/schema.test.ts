// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ID, asOwner, asRole, createTestDb, CUSTOMER_ID, errorOf } from "./test-db";

let db: PGlite;
const HASH = "a".repeat(64);

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN_ID}', 'owner@example.com'),
      ('${CUSTOMER_ID}', 'someone@example.com');
    insert into public.admin_users (user_id, note) values ('${ADMIN_ID}', 'test owner');
    insert into public.books (slug, title, price, stock_quantity, is_active, category_id)
      values ('pms-guide', 'PMS Guide', 1800, 5, true, (select id from public.categories where slug = 'css-pms')),
             ('hidden-book', 'Hidden', 500, 5, false, null);
    insert into public.posts (slug, title, kind, status, published_at)
      values ('live', 'Live vacancy', 'vacancy', 'published', now() - interval '1 day'),
             ('draft', 'Draft post', 'blog', 'draft', null),
             ('scheduled', 'Future post', 'blog', 'published', now() + interval '7 days');
    insert into public.orders (access_token_hash, customer_name, customer_phone, address, city,
                               delivery_method, delivery_fee, payment_method, subtotal, total)
      values ('${HASH}', 'Ali Khan', '03001234567', 'House 12, Street 4', 'Rawalpindi',
              'courier', 550, 'cod', 1800, 2350);
  `);
}, 60_000);

beforeEach(() => asOwner(db));

const count = async (sql: string) => (await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) q`)).rows[0].n;

describe("migrations", () => {
  it("seed the categories and the single settings row", async () => {
    expect(await count("select * from public.categories")).toBe(13);
    expect(await count("select * from public.store_settings")).toBe(1);
    await expect(db.exec("insert into public.store_settings (id) values (false)")).rejects.toThrow();
  });

  it("create storage buckets for covers and post images", async () => {
    const buckets = await db.query<{ id: string; public: boolean }>("select id, public from storage.buckets order by id");
    expect(buckets.rows).toEqual([
      { id: "book-covers", public: true },
      { id: "post-images", public: true },
    ]);
  });

  it("number orders DUB-10001, DUB-10002…", async () => {
    const r = await db.query<{ order_number: string }>("select order_number from public.orders");
    expect(r.rows[0].order_number).toBe("DUB-10001");
  });
});

describe("visitors (anon)", () => {
  beforeEach(() => asRole(db, "anon"));

  it("see active books only", async () => {
    const r = await db.query<{ slug: string }>("select slug from public.books order by slug");
    expect(r.rows.map((b) => b.slug)).toEqual(["pms-guide"]);
  });

  it("see published posts only (not drafts or scheduled)", async () => {
    const r = await db.query<{ slug: string }>("select slug from public.posts");
    expect(r.rows.map((p) => p.slug)).toEqual(["live"]);
  });

  it("cannot change books, prices or stock", async () => {
    expect(await errorOf(db.query("update public.books set price = 1 where slug = 'pms-guide'"))).toMatch(/permission denied/);
    expect(await errorOf(db.query("insert into public.books (slug, title, price) values ('x', 'X', 1)"))).toMatch(/permission denied/);
    expect(await errorOf(db.query("delete from public.books"))).toMatch(/permission denied/);
  });

  it("cannot read orders, customer details, settings or the admin list", async () => {
    for (const table of ["orders", "order_items", "order_events", "store_settings", "admin_users"]) {
      expect(await errorOf(db.query(`select * from public.${table}`)), table).toMatch(/permission denied/);
    }
  });

  it("cannot create orders directly", async () => {
    const err = await errorOf(
      db.query(`insert into public.orders (access_token_hash, customer_name, customer_phone, address, city,
        delivery_method, delivery_fee, payment_method, subtotal, total)
        values ('${HASH}', 'Hacker', '03001234567', 'Somewhere long', 'Lahore', 'courier', 0, 'cod', 0, 0)`),
    );
    expect(err).toMatch(/permission denied/);
  });

  it("can read public settings, without payment account numbers", async () => {
    const r = await db.query<Record<string, unknown>>("select * from public.get_public_settings()");
    expect(r.rows[0]).toMatchObject({ pakistan_post_fee: "300.00", courier_fee: "550.00", cod_enabled: true });
    expect(Object.keys(r.rows[0])).not.toContain("jazzcash_number");
    expect(Object.keys(r.rows[0])).not.toContain("easypaisa_number");
  });

  it("cannot upload images", async () => {
    expect(await errorOf(db.query("insert into storage.objects (bucket_id, name) values ('book-covers', 'x.png')"))).toMatch(
      /row-level security/,
    );
  });
});

describe("signed-in non-admin", () => {
  beforeEach(() => asRole(db, "authenticated", CUSTOMER_ID));

  it("is not an admin and cannot edit books", async () => {
    expect((await db.query<{ a: boolean }>("select public.is_admin() as a")).rows[0].a).toBe(false);
    const r = await db.query("update public.books set price = 1 where slug = 'pms-guide'");
    expect(r.affectedRows).toBe(0); // RLS hides the row from the update
  });

  it("cannot see orders or settings", async () => {
    expect(await count("select * from public.orders")).toBe(0);
    expect(await count("select * from public.store_settings")).toBe(0);
  });

  it("cannot make themselves an admin", async () => {
    expect(await errorOf(db.query(`insert into public.admin_users (user_id) values ('${CUSTOMER_ID}')`))).not.toBeNull();
  });

  it("cannot upload images", async () => {
    expect(await errorOf(db.query("insert into storage.objects (bucket_id, name) values ('book-covers', 'x.png')"))).toMatch(
      /row-level security/,
    );
  });
});

describe("admin", () => {
  beforeEach(() => asRole(db, "authenticated", ADMIN_ID));

  it("is recognised as admin", async () => {
    expect((await db.query<{ a: boolean }>("select public.is_admin() as a")).rows[0].a).toBe(true);
  });

  it("can see inactive books and drafts", async () => {
    expect(await count("select * from public.books")).toBe(2);
    expect(await count("select * from public.posts")).toBe(3);
  });

  it("can edit stock and read orders and settings", async () => {
    const r = await db.query("update public.books set stock_quantity = 7 where slug = 'pms-guide'");
    expect(r.affectedRows).toBe(1);
    expect(await count("select * from public.orders")).toBe(1);
    expect(await count("select * from public.store_settings")).toBe(1);
  });

  it("can upload images to shop buckets only", async () => {
    expect(await errorOf(db.query("insert into storage.objects (bucket_id, name) values ('book-covers', 'a.png')"))).toBeNull();
  });

  it("cannot create orders directly either", async () => {
    const err = await errorOf(
      db.query(`insert into public.orders (access_token_hash, customer_name, customer_phone, address, city,
        delivery_method, delivery_fee, payment_method, subtotal, total)
        values ('${HASH}', 'Admin', '03001234567', 'Somewhere long', 'Lahore', 'courier', 0, 'cod', 0, 0)`),
    );
    // Blocked either by the order-number sequence grant or by RLS; both mean "no".
    expect(err).toMatch(/permission denied|row-level security/);
  });
});

describe("data rules (enforced by the database itself)", () => {
  const bookErr = (values: string) =>
    errorOf(db.query(`insert into public.books (slug, title, price, stock_quantity, compare_at_price, isbn) values ${values}`));

  it("rejects negative stock and prices", async () => {
    expect(await bookErr("('neg-stock', 'X', 100, -1, null, null)")).toMatch(/check constraint/);
    expect(await bookErr("('neg-price', 'X', -5, 1, null, null)")).toMatch(/check constraint/);
  });

  it("rejects a 'was' price that is not higher than the price", async () => {
    expect(await bookErr("('bad-compare', 'X', 500, 1, 400, null)")).toMatch(/check constraint/);
    expect(await bookErr("('ok-compare', 'X', 500, 1, 600, null)")).toBeNull();
  });

  it("rejects bad slugs, duplicate slugs and bad ISBNs", async () => {
    expect(await bookErr("('Bad Slug!', 'X', 100, 1, null, null)")).toMatch(/check constraint/);
    expect(await bookErr("('pms-guide', 'X', 100, 1, null, null)")).toMatch(/duplicate key/);
    expect(await bookErr("('bad-isbn', 'X', 100, 1, null, '12-34')")).toMatch(/check constraint/);
    expect(await bookErr("('good-isbn', 'X', 100, 1, null, '9789690000000')")).toBeNull();
  });

  it("rejects COD with Pakistan Post and totals that don't add up", async () => {
    const order = (delivery: string, payment: string, sub: number, fee: number, total: number) =>
      errorOf(
        db.query(`insert into public.orders (access_token_hash, customer_name, customer_phone, address, city,
          delivery_method, delivery_fee, payment_method, subtotal, total)
          values ('${HASH}', 'Ali', '03001234567', 'House 1, Street 2', 'Pindi', '${delivery}', ${fee}, '${payment}', ${sub}, ${total})`),
      );
    expect(await order("pakistan_post", "cod", 1000, 300, 1300)).toMatch(/orders_cod_needs_courier/);
    expect(await order("courier", "cod", 1000, 550, 1)).toMatch(/orders_total_matches/);
    expect(await order("pakistan_post", "jazzcash", 1000, 300, 1300)).toBeNull();
  });

  it("rejects bad phone numbers on orders", async () => {
    const err = await errorOf(
      db.query(`insert into public.orders (access_token_hash, customer_name, customer_phone, address, city,
        delivery_method, delivery_fee, payment_method, subtotal, total)
        values ('${HASH}', 'Ali', '12345', 'House 1, Street 2', 'Pindi', 'courier', 550, 'cod', 0, 550)`),
    );
    expect(err).toMatch(/check constraint/);
  });

  it("calculates order line totals itself and limits quantity", async () => {
    const orderId = (await db.query<{ id: string }>("select id from public.orders limit 1")).rows[0].id;
    const bookId = (await db.query<{ id: string }>("select id from public.books where slug = 'pms-guide'")).rows[0].id;
    await db.query("insert into public.order_items (order_id, book_id, title_snapshot, unit_price, quantity) values ($1, $2, 'PMS Guide', 1800, 2)", [orderId, bookId]);
    const r = await db.query<{ line_total: string }>("select line_total from public.order_items where order_id = $1", [orderId]);
    expect(r.rows[0].line_total).toBe("3600.00");
    expect(
      await errorOf(db.query("insert into public.order_items (order_id, book_id, title_snapshot, unit_price, quantity) values ($1, null, 'X', 10, 50)", [orderId])),
    ).toMatch(/check constraint/);
  });

  it("only allows safe https apply links on posts", async () => {
    const post = (url: string) =>
      errorOf(db.query("insert into public.posts (slug, title, kind, apply_url) values ($1, 'X', 'vacancy', $2)", [`p-${Math.random().toString(36).slice(2, 8)}`, url]));
    expect(await post("javascript:alert(1)")).toMatch(/check constraint/);
    expect(await post("http://example.com")).toMatch(/check constraint/);
    expect(await post("https://user:pw@evil.com")).toMatch(/check constraint/);
    expect(await post("https://www.ppsc.gop.pk/jobs?id=4")).toBeNull();
  });

  it("requires a publish date on published posts", async () => {
    expect(await errorOf(db.query("insert into public.posts (slug, title, kind, status) values ('nodate', 'X', 'blog', 'published')"))).toMatch(
      /posts_published_needs_date/,
    );
  });

  it("keeps updated_at current", async () => {
    const before = (await db.query<{ t: string }>("select updated_at::text t from public.books where slug = 'pms-guide'")).rows[0].t;
    await new Promise((r) => setTimeout(r, 20));
    await db.query("update public.books set title = 'PMS Guide 2026' where slug = 'pms-guide'");
    const after = (await db.query<{ t: string }>("select updated_at::text t from public.books where slug = 'pms-guide'")).rows[0].t;
    expect(after > before).toBe(true);
  });
});
