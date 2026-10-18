import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = join(__dirname, "..");

/** Fresh in-memory Postgres with the Supabase shim and all real migrations applied. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, "tests", "supabase-shim.sql"), "utf8"));
  const migrations = readdirSync(join(root, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    try {
      await db.exec(readFileSync(join(root, "migrations", file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

export const ADMIN_ID = "00000000-0000-4000-8000-00000000a001";
export const CUSTOMER_ID = "00000000-0000-4000-8000-00000000c001";

/** Run queries as a Supabase role. "authenticated" needs a user id. */
export async function asRole(db: PGlite, role: "anon" | "authenticated" | "service_role", userId = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec(`set role ${role}`);
}

export async function asOwner(db: PGlite) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}

/** Resolves to the error message, or null if the query succeeded. */
export async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}
