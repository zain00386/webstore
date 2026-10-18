// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { buildSetupSql } from "./bundle";

describe("supabase/setup-all.sql", () => {
  it("is up to date with supabase/migrations (run `npm run db:bundle` if this fails)", () => {
    expect(readFileSync("supabase/setup-all.sql", "utf8")).toBe(buildSetupSql("supabase/migrations"));
  });

  it("runs cleanly in one go on a fresh database", async () => {
    const db = new PGlite();
    await db.exec(readFileSync("supabase/tests/supabase-shim.sql", "utf8"));
    await db.exec(readFileSync("supabase/setup-all.sql", "utf8"));
    const r = await db.query<{ n: number }>("select count(*)::int n from public.categories");
    expect(r.rows[0].n).toBe(13);
  }, 60_000);
});
