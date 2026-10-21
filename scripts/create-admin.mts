/**
 * npm run db:create-admin            (asks for the email)
 * npm run db:create-admin -- --email=you@example.com
 *
 * Creates (or reuses) a Supabase Auth user with that email and adds it to
 * admin_users. If the user is new, a strong random password is generated and
 * shown ONCE in your terminal — save it in a password manager straight away.
 * Run this on your own computer only; the password is never stored anywhere else.
 */
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "../src/lib/supabase/database.types";
import { loadScriptEnv } from "./lib/script-env";

let emailArg = process.argv.slice(2).find((a) => a.startsWith("--email="))?.slice(8);
if (!emailArg) {
  // Asking avoids shell quoting problems with "@" in PowerShell.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  emailArg = await rl.question("\nAdmin email address: ");
  rl.close();
}
const email = z.email().safeParse(emailArg?.trim().toLowerCase());
if (!email.success) {
  console.error("\n✗ That doesn't look like an email address. Run `npm run db:create-admin` again.\n");
  process.exit(1);
}

const env = loadScriptEnv();
const db = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Find an existing user by email (paged; fine for a small shop). */
async function findUser(address: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === address);
    if (match || data.users.length < 200) return match ?? null;
  }
  return null;
}

let user = await findUser(email.data);
let password: string | null = null;

if (!user) {
  // 24 random bytes → 32 URL-safe characters.
  password = randomBytes(24).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email: email.data, password, email_confirm: true });
  if (error) {
    console.error(`\n✗ Could not create the user: ${error.message}\n`);
    process.exit(1);
  }
  user = data.user;
}

const { error: adminError } = await db.from("admin_users").upsert({ user_id: user.id, note: "Owner" }, { onConflict: "user_id" });
if (adminError) {
  console.error(`\n✗ Could not add admin rights (have you run supabase/setup-all.sql?): ${adminError.message}\n`);
  process.exit(1);
}

console.log(`\n✓ ${email.data} is an admin.`);
if (password) {
  console.log("\n  Your new admin password (shown only now — save it in a password manager):\n");
  console.log(`      ${password}\n`);
  console.log("  Forgot it later? Run npm run db:reset-admin-password to get a new one.\n");
} else {
  console.log("  This account already existed; its password was not changed.\n");
}
