/**
 * npm run db:check
 * Checks that .env.local is filled in, the migrations have been run, security
 * rules are working, and storage buckets exist. Prints no secret values.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { loadScriptEnv } from "./lib/script-env";

const env = loadScriptEnv();
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const visitor = createClient<Database>(env.url, env.anonKey, opts);
const server = createClient<Database>(env.url, env.serviceKey, opts);

let failures = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string, hint?: string) => {
  failures++;
  console.log(`  ✗ ${msg}${hint ? `\n      → ${hint}` : ""}`);
};
const warn = (msg: string) => console.log(`  ! ${msg}`);

console.log(`\nChecking Supabase project ${new URL(env.url).host}\n`);

// 1. Tables exist (migration 0001)
const cats = await server.from("categories").select("slug", { count: "exact", head: true });
if (cats.error) {
  fail("Database tables not found", "Paste supabase/setup-all.sql into Supabase > SQL Editor and click Run (docs/database-setup.md, step 3).");
} else {
  ok(`Tables exist (${cats.count} categories)`);
}

// 2. Visitor access is limited (migration 0002)
const publicBooks = await visitor.from("books").select("id", { count: "exact", head: true });
if (publicBooks.error) fail(`Visitors cannot read books: ${publicBooks.error.message}`);
else ok(`Visitors can read active books (${publicBooks.count})`);

const leakedOrders = await visitor.from("orders").select("id").limit(1);
if (leakedOrders.error || (leakedOrders.data ?? []).length === 0) ok("Visitors cannot read orders");
else fail("Visitors CAN read orders", "Run supabase/migrations/20261018000002_security.sql.");

const leakedSettings = await visitor.from("store_settings").select("jazzcash_number").limit(1);
if (leakedSettings.error || (leakedSettings.data ?? []).length === 0) ok("Visitors cannot read payment account settings");
else fail("Visitors CAN read store_settings", "Run supabase/migrations/20261018000002_security.sql.");

const settings = await visitor.rpc("get_public_settings");
if (settings.error || !settings.data?.[0]) fail("Public settings are not readable", settings.error?.message);
else ok(`Public settings OK (Pakistan Post Rs. ${settings.data[0].pakistan_post_fee}, TCS/Leopards Rs. ${settings.data[0].courier_fee})`);

const write = await visitor.from("books").update({ price: 1 }).eq("slug", "__never__");
if (write.error) ok("Visitors cannot change books");
else fail("Visitors may be able to change books", "Run supabase/migrations/20261018000002_security.sql.");

// 3. Storage (migration 0003)
const buckets = await server.storage.listBuckets();
if (buckets.error) fail(`Could not list storage buckets: ${buckets.error.message}`);
else {
  const names = buckets.data.map((b) => b.name);
  for (const b of ["book-covers", "post-images"]) {
    if (names.includes(b)) ok(`Storage bucket "${b}" exists`);
    else fail(`Storage bucket "${b}" missing`, "Run supabase/migrations/20261018000003_storage.sql.");
  }
}

// 4. Public sign-up must be off (there is no sign-up page; admins are added by hand)
try {
  const res = await fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.anonKey } });
  const authSettings = (await res.json()) as { disable_signup?: boolean };
  if (authSettings.disable_signup) ok("Public sign-up is turned off");
  else
    fail(
      "Public sign-up is ON",
      'Supabase > Authentication > Sign In / Providers: turn off "Allow new users to sign up", then Save.',
    );
} catch (e) {
  warn(`Could not read sign-up setting (${(e as Error).message})`);
}

// 5. Admin + data
const admins = await server.from("admin_users").select("user_id", { count: "exact", head: true });
if (!admins.error) {
  if (admins.count) ok(`${admins.count} admin account(s) set up`);
  else warn("No admin yet — run: npm run db:create-admin -- --email=you@example.com");
}

const allBooks = await server.from("books").select("id", { count: "exact", head: true });
if (!allBooks.error) {
  if (allBooks.count) ok(`${allBooks.count} books in the database`);
  else warn("No books yet — run: npm run db:import");
}

console.log(failures ? `\n${failures} problem(s) found.\n` : "\nAll checks passed.\n");
process.exit(failures ? 1 : 0);
