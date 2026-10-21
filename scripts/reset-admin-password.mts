/**
 * npm run db:reset-admin-password     (asks for the email)
 *
 * Gives an EXISTING admin a new strong random password and shows it ONCE in
 * your terminal. Use it if you forgot your password or think someone saw it.
 * Run this on your own computer only; the password is never stored anywhere else.
 */
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../src/lib/supabase/database.types";
import { loadScriptEnv } from "./lib/script-env";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const typed = await rl.question("\nAdmin email address: ");
rl.close();
const email = z.email().safeParse(typed.trim().toLowerCase());
if (!email.success) {
  console.error("\n✗ That doesn't look like an email address. Run `npm run db:reset-admin-password` again.\n");
  process.exit(1);
}

const env = loadScriptEnv();
const db = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let user = null;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw new Error(`Could not list users: ${error.message}`);
  user = data.users.find((u) => u.email?.toLowerCase() === email.data) ?? null;
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`\n✗ No account with ${email.data}. To make a new admin, run npm run db:create-admin.\n`);
  process.exit(1);
}
const { data: isAdmin } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
if (!isAdmin) {
  console.error(`\n✗ ${email.data} is not an admin, so its password was not changed.\n`);
  process.exit(1);
}

// 24 random bytes → 32 URL-safe characters.
const password = randomBytes(24).toString("base64url");
const { error } = await db.auth.admin.updateUserById(user.id, { password });
if (error) {
  console.error(`\n✗ Could not change the password: ${error.message}\n`);
  process.exit(1);
}
console.log(`\n✓ New password for ${email.data} (shown only now — save it in a password manager):\n`);
console.log(`      ${password}\n`);
console.log("  The old password no longer works. Sign in at /admin/login with this one.\n");
