// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ID, asOwner, asRole, createTestDb, CUSTOMER_ID, errorOf } from "./test-db";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN_ID}', 'owner@example.com'), ('${CUSTOMER_ID}', 'someone@example.com');
    insert into public.admin_users (user_id) values ('${ADMIN_ID}');
    insert into public.banner_slides (title, button_label, button_href, is_active, sort_order)
      values ('FIA preparation', 'Buy now', '/books?exam=jobs', true, 1),
             ('Hidden draft', 'Buy now', '/books', false, 2);
  `);
}, 60_000);

beforeEach(() => asOwner(db));

const titles = async () => (await db.query<{ title: string }>("select title from public.banner_slides order by sort_order")).rows.map((r) => r.title);

describe("banner slides", () => {
  it("visitors see only switched-on slides and can't change them", async () => {
    await asRole(db, "anon");
    expect(await titles()).toEqual(["FIA preparation"]);
    expect(await errorOf(db.query("insert into public.banner_slides (title, button_label, button_href) values ('x', 'y', '/')"))).toMatch(/permission denied/);
    expect(await errorOf(db.query("update public.banner_slides set title = 'hacked'"))).toMatch(/permission denied/);
  });

  it("signed-in non-admins can't add or edit slides", async () => {
    await asRole(db, "authenticated", CUSTOMER_ID);
    expect(await titles()).toEqual(["FIA preparation"]);
    expect(await errorOf(db.query("insert into public.banner_slides (title, button_label, button_href) values ('x', 'y', '/')"))).toMatch(/row-level security/);
    await db.query("update public.banner_slides set title = 'hacked'");
    await asOwner(db);
    expect(await titles()).not.toContain("hacked");
  });

  it("admins see hidden slides and can manage them", async () => {
    await asRole(db, "authenticated", ADMIN_ID);
    expect(await titles()).toEqual(["FIA preparation", "Hidden draft"]);
    await db.query("insert into public.banner_slides (title, button_label, button_href, secondary_label, secondary_href) values ('New', 'Shop', 'https://dogarpublishers.com.pk/x', 'More', '/blog')");
    await db.query("delete from public.banner_slides where title = 'New'");
  });

  it("only accepts safe links and complete second buttons", async () => {
    for (const href of ["javascript:alert(1)", "http://example.com", "//evil.com", "/books <script>"]) {
      expect(await errorOf(db.query("insert into public.banner_slides (title, button_label, button_href) values ('x', 'y', $1)", [href]))).toMatch(/check constraint/);
    }
    expect(await errorOf(db.query("insert into public.banner_slides (title, button_label, button_href, secondary_label) values ('x', 'y', '/', 'z')"))).toMatch(/banner_slides_secondary_pair/);
  });
});
