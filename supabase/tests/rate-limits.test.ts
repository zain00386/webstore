// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asOwner, asRole, createTestDb, errorOf } from "./test-db";

let db: PGlite;
const KEY = "a".repeat(64);
const OTHER = "b".repeat(64);

beforeAll(async () => {
  db = await createTestDb();
}, 60_000);

beforeEach(() => asOwner(db));

const check = async (key = KEY, limit = 3) =>
  (await db.query<{ wait: number }>("select public.rate_limit_check('login', $1, $2, 900) as wait", [key, limit])).rows[0].wait;
const hit = (key = KEY) => db.query("select public.rate_limit_hit('login', $1)", [key]);

describe("shared rate limits", () => {
  it("allows up to the limit, then asks to wait; keys don't affect each other", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await check()).toBe(0);
      await hit();
    }
    const wait = await check();
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(900);
    expect(await check(OTHER)).toBe(0);
  });

  it("reset forgets a key", async () => {
    await db.query("select public.rate_limit_reset('login', $1)", [KEY]);
    expect(await check()).toBe(0);
  });

  it("only stores scrambled keys and rejects anything else", async () => {
    expect(await errorOf(db.query("select public.rate_limit_hit('login', '03001234567')"))).toMatch(/check constraint/);
  });

  it("can't be used or read from a browser", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      await asRole(db, role, role === "authenticated" ? "00000000-0000-4000-8000-00000000c001" : "");
      expect(await errorOf(db.query("select public.rate_limit_hit('login', $1)", [KEY]))).toMatch(/permission denied/);
      expect(await errorOf(db.query("select * from public.rate_limit_hits"))).toMatch(/permission denied/);
    }
  });
});
