/**
 * npm run db:change-admin-email
 * Changes the email of an existing admin account. The password stays the same.
 * Asks for both emails (avoids PowerShell quoting problems with "@").
 */
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../src/lib/supabase/database.types";
import { loadScriptEnv } from "./lib/script-env";

const env = loadScriptEnv();
const db = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Read answers line by line (works when typed, and when piped in all at once).
const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const next = await lines.next();
  return next.done ? "" : String(next.value);
}
const oldEmail = (await ask("\nCurrent admin email: ")).trim().toLowerCase();
const newEmail = (await ask("New email: ")).trim().toLowerCase();
rl.close();

if (!z.email().safeParse(oldEmail).success || !z.email().safeParse(newEmail).success) {
  console.error("\n✗ One of those doesn't look like an email address. Nothing was changed.\n");
  process.exit(1);
}

async function findUser(address: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === address);
    if (match || data.users.length < 200) return match ?? null;
  }
  return null;
}

const user = await findUser(oldEmail);
if (!user) {
  console.error(`\n✗ No account found for ${oldEmail}. Nothing was changed.\n`);
  process.exit(1);
}
const { data: admin } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
if (!admin) {
  console.error(`\n✗ ${oldEmail} is not an admin. Nothing was changed.\n`);
  process.exit(1);
}
if (await findUser(newEmail)) {
  console.error(`\n✗ ${newEmail} is already used by another account. Nothing was changed.\n`);
  process.exit(1);
}

// email_confirm: true applies the change immediately (no confirmation email needed).
const { error } = await db.auth.admin.updateUserById(user.id, { email: newEmail, email_confirm: true });
if (error) {
  console.error(`\n✗ Could not change the email: ${error.message}\n`);
  process.exit(1);
}

console.log(`\n✓ Admin email changed from ${oldEmail} to ${newEmail}. Your password is unchanged.\n`);
