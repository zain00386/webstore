// npm run e2e:settings  (needs the site running on http://localhost:3000 and migrations 0005-0008)
// Admin changes the courier fee, switches COD off and adds a delivery note; the shop and an
// order follow. The real settings are put back exactly afterwards.
import { randomBytes, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, signIn, sleep, type Browser } from "./lib";
import { clearOrderRateLimits } from "./lib";

const env = loadScriptEnv();
await clearOrderRateLimits(env.url, env.serviceKey);
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-settings-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const slug = `e2e-settings-book-${tag}`;
const phone = `0399${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
const note = `E2E delivery note ${tag}`;
const r = reporter();
let userId: string | null = null;
let bookId: string | null = null;

const COLUMNS = "phone, whatsapp_e164, address, pakistan_post_enabled, pakistan_post_fee, courier_enabled, courier_fee, cod_enabled, delivery_notes, low_stock_threshold";
const settings = async () => (await svc.from("store_settings").select(COLUMNS).eq("id", true).single()).data!;
const original = await settings();
const html = async (path: string) => (await fetch(BASE + path, { cache: "no-store" })).text();
const setChecked = (b: Browser, name: string, on: boolean) => b.js(`(() => { document.querySelector('input[name="${name}"]').checked = ${on}; })()`);
const save = async (b: Browser) => {
  // Wait for earlier pop-ups to close by themselves (removing them would break React), so only the new result is read.
  await b.waitFor(() => b.js<boolean>(`document.querySelectorAll('[data-sonner-toast]').length === 0`), 15000);
  await b.clickText("button", "Save store & delivery");
  await b.waitFor(async () => /Store and delivery settings saved|Please fix|changed somewhere|Pakistan Post needs/.test(await b.text()), 20000);
  await sleep(300);
  return b.text();
};

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });
  const book = await svc.from("books").insert({ slug, title: `E2E Settings Book ${tag}`, price: 400, stock_quantity: 5, publisher: "E2E" }).select("id").single();
  if (book.error) throw book.error;
  bookId = book.data.id;

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/settings");
  await b.waitForText("Save store & delivery", 30000);

  // 1. Invalid: COD on with the courier off, a fee with paisa
  await setChecked(b, "courierEnabled", false);
  await b.fill('[name="courierFee"]', "612.5");
  let t = await save(b);
  r.check("COD without courier and a non-whole fee are refused", t.includes("Cash on Delivery works only with the courier") && t.includes("whole rupees"));
  r.check("nothing saved", (await settings()).courier_fee === original.courier_fee);

  // 2. Courier fee 612, COD off, a delivery note
  await setChecked(b, "courierEnabled", true);
  await setChecked(b, "codEnabled", false);
  await b.fill('[name="courierFee"]', "612");
  await b.fill('textarea[name="deliveryNotes"]', note);
  t = await save(b);
  r.check("settings saved", t.includes("Store and delivery settings saved"), t.slice(t.indexOf("Settings"), t.indexOf("Settings") + 900));
  const saved = await settings();
  r.check("database has the new values", saved.courier_fee === 612 && saved.cod_enabled === false && saved.delivery_notes === note, JSON.stringify(saved));

  // 3. The shop follows straight away
  const shipping = await html("/shipping");
  r.check("shipping page shows Rs. 612 and the note, no COD section", shipping.includes("Rs. 612") && shipping.includes(note) && !shipping.includes("<h2>Cash on Delivery</h2>"));
  r.check("footer shows Rs. 612", (await html("/about")).includes("Rs. 612"));
  await b.go("/");
  await b.js(`localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(bookId)}, slug: ${JSON.stringify(slug)}, title: 'x', publisher: null, coverUrl: null, price: 400, compareAtPrice: null, maxQuantity: 9, quantity: 1 }]))`);
  await b.go("/checkout");
  await b.waitFor(async () => (await b.text()).includes("Place order"), 30000);
  r.check("checkout has no Cash on Delivery", !(await b.js<boolean>(`!!document.querySelector('input[name="paymentMethod"][value="cod"]')`)));
  const button = await b.js<string>(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('Place order'))?.textContent ?? ''`);
  r.check("checkout total uses the new fee (400 + 612)", button.includes("Rs. 1,012"), button);

  // 4. A real order is charged the new fee by the database
  await b.fill('[name="name"]', "E2E Customer");
  await b.fill('[name="phone"]', phone);
  await b.fill('textarea[name="address"]', "House 1, Street 2, Satellite Town");
  await b.fill('[name="city"]', "Rawalpindi");
  await b.click('input[name="paymentMethod"][value="jazzcash"]');
  await sleep(200);
  await b.clickText("button", "Place order");
  await b.waitFor(async () => (await b.url()).startsWith("/order-confirmation/DUB-"), 40000);
  const order = (await svc.from("orders").select("delivery_fee, total").eq("customer_phone", phone).single()).data;
  r.check("order charged Rs. 612 delivery by the database", order?.delivery_fee === 612 && order.total === 1012, JSON.stringify(order));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("store_settings").update(original).eq("id", true);
  await svc.from("orders").delete().eq("customer_phone", phone);
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  if (userId) await svc.auth.admin.deleteUser(userId);
  r.check("real settings put back exactly", JSON.stringify(await settings()) === JSON.stringify(original));
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
