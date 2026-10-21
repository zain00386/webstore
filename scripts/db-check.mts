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
// A missing table can come back as "no error, count null" on head requests, so require a real count.
if (cats.error || cats.count == null || cats.count === 0) {
  fail("Database tables not found", "Paste supabase/setup-all.sql into Supabase > SQL Editor and click Run (docs/database-setup.md, step 3).");
} else {
  ok(`Tables exist (${cats.count} categories)`);
}

// 2. Visitor access is limited (migration 0002)
const publicBooks = await visitor.from("books").select("id", { count: "exact", head: true });
if (publicBooks.error || publicBooks.count == null) fail(`Visitors cannot read books${publicBooks.error ? `: ${publicBooks.error.message}` : " (books table not found)"}`);
else ok(`Visitors can read active books (${publicBooks.count})`);

const leakedOrders = await visitor.from("orders").select("id").limit(1);
if (leakedOrders.error || (leakedOrders.data ?? []).length === 0) ok("Visitors cannot read orders");
else fail("Visitors CAN read orders", "Paste supabase/setup-all.sql into the SQL Editor and click Run.");

const leakedSettings = await visitor.from("store_settings").select("jazzcash_number").limit(1);
if (leakedSettings.error || (leakedSettings.data ?? []).length === 0) ok("Visitors cannot read payment account settings");
else fail("Visitors CAN read store_settings", "Paste supabase/setup-all.sql into the SQL Editor and click Run.");

const settings = await visitor.rpc("get_public_settings");
if (settings.error || !settings.data?.[0]) fail("Public settings are not readable", settings.error?.message);
else ok(`Public settings OK (Pakistan Post Rs. ${settings.data[0].pakistan_post_fee}, TCS/Leopards Rs. ${settings.data[0].courier_fee})`);

const write = await visitor.from("books").update({ price: 1 }).eq("slug", "__never__");
if (write.error) ok("Visitors cannot change books");
else fail("Visitors may be able to change books", "Paste supabase/setup-all.sql into the SQL Editor and click Run.");

// 3. Storage (migration 0003)
const buckets = await server.storage.listBuckets();
if (buckets.error) fail(`Could not list storage buckets: ${buckets.error.message}`);
else {
  const names = buckets.data.map((b) => b.name);
  for (const b of ["book-covers", "post-images"]) {
    if (names.includes(b)) ok(`Storage bucket "${b}" exists`);
    else fail(`Storage bucket "${b}" missing`, "Paste supabase/setup-all.sql into the SQL Editor and click Run.");
  }
}

// 3b. Ordering step (migration 0004). An empty item list is refused without changing anything.
const probe = await server.rpc("place_order", {
  p_idempotency_key: "00000000-0000-4000-8000-000000000000",
  p_access_token_hash: "0".repeat(64),
  p_customer: { name: "check", phone: "03000000000", email: "", address: "check only", city: "check", notes: "" },
  p_delivery_method: "courier",
  p_payment_method: "cod",
  p_items: [],
});
if (probe.error?.message.includes("INVALID_ITEMS")) ok("Ordering step (place_order) is installed");
else if (probe.error && /Could not find the function|does not exist/i.test(probe.error.message)) {
  fail("Ordering step (place_order) is missing", "Paste supabase/migrations/20261019000004_place_order.sql into the SQL Editor and click Run.");
} else fail(`Ordering step check gave an unexpected result: ${probe.error?.message ?? "no error"}`);

const visitorOrder = await visitor.rpc("place_order", {
  p_idempotency_key: "00000000-0000-4000-8000-000000000000",
  p_access_token_hash: "0".repeat(64),
  p_customer: { name: "check", phone: "03000000000", email: "", address: "check only", city: "check", notes: "" },
  p_delivery_method: "courier",
  p_payment_method: "cod",
  p_items: [],
});
if (visitorOrder.error && !visitorOrder.error.message.includes("INVALID_ITEMS")) ok("Visitors cannot call the ordering step directly");
else fail("Visitors CAN call the ordering step", "Re-run supabase/migrations/20261019000004_place_order.sql.");

// 3c. Bank transfer (migration 0005): public settings report the switch, never the account details.
const pub = await visitor.rpc("get_public_settings");
const pubRow = pub.data?.[0] as Record<string, unknown> | undefined;
if (pubRow && "bank_enabled" in pubRow) ok("Bank transfer option is installed");
else fail("Bank transfer option is missing", "Paste supabase/migrations/20261021000005_bank_transfer.sql into the SQL Editor and click Run.");
if (pubRow && ["jazzcash_number", "easypaisa_number", "bank_account_number", "bank_iban"].some((k) => k in pubRow)) {
  fail("Public settings expose payment account numbers", "Re-run supabase/migrations/20261021000005_bank_transfer.sql.");
}

// 3d. Admin order step (migration 0006). Called without an admin login, it must refuse.
const adminStep = await server.rpc("admin_update_order", {
  p_order_id: "00000000-0000-4000-8000-000000000000",
  p_expected_updated_at: new Date().toISOString(),
  p_action: "confirm",
});
if (adminStep.error?.message.includes("NOT_ADMIN")) ok("Admin order management is installed");
else if (adminStep.error && /Could not find the function|does not exist/i.test(adminStep.error.message)) {
  fail("Admin order management is missing", "Paste supabase/migrations/20261021000006_admin_orders.sql into the SQL Editor and click Run.");
} else fail(`Admin order check gave an unexpected result: ${adminStep.error?.message ?? "no error"}`);

// 3e. "Publish now" uses the database clock (migration 0007): a dated-less published test post gets a date.
const probeSlug = `db-check-probe-${Date.now()}`;
const probePost = await server.from("posts").insert({ slug: probeSlug, title: "db check", kind: "blog", status: "published" }).select("published_at");
await server.from("posts").delete().eq("slug", probeSlug);
if (!probePost.error && probePost.data?.[0]?.published_at) ok("Posts publish with the database clock");
else fail("Posts can't be published without a date yet", "Paste supabase/migrations/20261021000007_posts_publish_now.sql into the SQL Editor and click Run.");

// 3f. Delivery note setting (migration 0008).
if (pubRow && "delivery_notes" in pubRow) ok("Delivery settings are installed");
else fail("Delivery settings are missing", "Paste supabase/migrations/20261021000008_delivery_notes.sql into the SQL Editor and click Run.");

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
