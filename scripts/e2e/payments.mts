// npm run e2e:payments  (needs the site running on http://localhost:3000 and migration 0005)
// Admin enters payment accounts, checkout offers bank transfer, the order page shows the details.
// Uses a temporary admin, book and test orders; the real payment settings are put back afterwards.
import { randomBytes, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { launchBrowser, reporter, signIn, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-pay-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const slug = `e2e-pay-book-${tag}`;
const phone = `0399${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
const r = reporter();
let userId: string | null = null;
let bookId: string | null = null;

const PAYMENT_COLUMNS =
  "jazzcash_enabled, jazzcash_account_title, jazzcash_number, easypaisa_enabled, easypaisa_account_title, easypaisa_number, bank_enabled, bank_name, bank_account_title, bank_account_number, bank_iban, payment_instructions";
const settings = async () => (await svc.from("store_settings").select(PAYMENT_COLUMNS).eq("id", true).single()).data!;
const original = await settings();

const setChecked = (b: Browser, name: string, on: boolean) =>
  b.js(`(() => { const el = document.querySelector('input[name="${name}"]'); el.checked = ${on}; })()`);
const save = async (b: Browser) => {
  await b.clickText("button", "Save payment details");
  await b.waitFor(async () => /Payment details saved|Please fix the highlighted fields|changed somewhere else/.test(await b.text()), 20000);
  await sleep(300);
  return b.text();
};

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });
  const book = await svc.from("books").insert({ slug, title: `E2E Pay Book ${tag}`, price: 900, stock_quantity: 3, publisher: "E2E" }).select("id").single();
  if (book.error) throw book.error;
  bookId = book.data.id;

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/settings");
  await b.waitForText("Bank transfer", 30000);
  r.check("settings page shows the payment form", (await b.text()).includes("Save payment details"));

  // 1. Bank switched on without details -> refused, nothing saved
  await setChecked(b, "bankEnabled", true);
  await b.fill('[name="bankName"]', "");
  let t = await save(b);
  r.check("bank transfer can't be switched on without details", t.includes("Needed while bank transfer is switched on"));
  r.check("nothing was saved", (await settings()).bank_enabled === original.bank_enabled);

  // 2. Valid details (messy spacing on purpose) -> saved and cleaned up
  await setChecked(b, "jazzcashEnabled", true);
  await b.fill('[name="jazzcashNumber"]', "0300 111 2223");
  await b.fill('[name="jazzcashTitle"]', "E2E Jazz Title");
  await setChecked(b, "bankEnabled", true);
  await b.fill('[name="bankName"]', "E2E Bank");
  await b.fill('[name="bankTitle"]', "E2E Account Title");
  await b.fill('[name="bankAccountNumber"]', "0123 4567 8901");
  await b.fill('[name="bankIban"]', "pk36 scbl 0000 0011 2345 6702");
  t = await save(b);
  r.check("valid payment details are saved", t.includes("Payment details saved"), t.slice(0, 300));
  const saved = await settings();
  r.check("numbers are tidied (0300-1112223, IBAN upper-case without spaces)", saved.jazzcash_number === "0300-1112223" && saved.bank_iban === "PK36SCBL0000001123456702", JSON.stringify(saved));

  // 3. Public pages never show the account numbers
  const home = await (await fetch("http://localhost:3000/")).text();
  const checkoutHtml = await (await fetch("http://localhost:3000/checkout")).text();
  r.check("account numbers are not on public pages", ![home, checkoutHtml].some((h) => h.includes("1123456702") || h.includes("0123 4567 8901") || h.includes("0300-1112223")));

  // 4. Checkout offers bank transfer; order with Pakistan Post
  await b.go("/");
  await b.js(`localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(bookId)}, slug: ${JSON.stringify(slug)}, title: 'x', publisher: null, coverUrl: null, price: 1, compareAtPrice: null, maxQuantity: 9, quantity: 1 }]))`);
  await b.go("/checkout");
  await b.waitFor(async () => (await b.text()).includes("Place order"), 30000);
  r.check("checkout offers Bank transfer", await b.js<boolean>(`!!document.querySelector('input[name="paymentMethod"][value="bank_transfer"]')`));
  await b.fill('[name="name"]', "E2E Customer");
  await b.fill('[name="phone"]', phone);
  await b.fill('textarea[name="address"]', "House 1, Street 2, Satellite Town");
  await b.fill('[name="city"]', "Rawalpindi");
  await b.click('input[name="deliveryMethod"][value="pakistan_post"]');
  await sleep(200);
  await b.click('input[name="paymentMethod"][value="bank_transfer"]');
  await sleep(200);
  await b.clickText("button", "Place order");
  await b.waitFor(async () => (await b.url()).startsWith("/order-confirmation/DUB-"), 40000);
  await b.waitForText("Thank you, your order is placed", 20000);
  t = await b.text();
  r.check("order page shows bank, title, account number and IBAN", ["E2E Bank", "E2E Account Title", "0123 4567 8901", "PK36SCBL0000001123456702"].every((x) => t.includes(x)));
  r.check("order page asks for Rs. 1,200 by Bank transfer (900 + 300)", t.includes("send Rs. 1,200 by Bank transfer"));
  r.check("IBAN has a copy button", await b.js<boolean>(`!!document.querySelector('button[aria-label="Copy IBAN"]')`));
  const order = (await svc.from("orders").select("payment_method, payment_status, total").eq("customer_phone", phone).single()).data;
  r.check("order stored as bank transfer, payment pending", order?.payment_method === "bank_transfer" && order.payment_status === "pending" && order.total === 1200, JSON.stringify(order));

  // 5. Switched off again -> checkout no longer offers it
  await b.go("/admin/settings");
  await b.waitForText("Save payment details", 30000);
  await setChecked(b, "bankEnabled", false);
  t = await save(b);
  r.check("bank transfer switched off", t.includes("Payment details saved") && (await settings()).bank_enabled === false);
  await b.go("/checkout");
  await b.waitFor(async () => (await b.text()).includes("Place order"), 30000);
  r.check("checkout no longer offers Bank transfer", !(await b.js<boolean>(`!!document.querySelector('input[name="paymentMethod"][value="bank_transfer"]')`)));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("store_settings").update(original).eq("id", true);
  await svc.from("orders").delete().eq("customer_phone", phone);
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  if (userId) await svc.auth.admin.deleteUser(userId);
  const restored = await settings();
  r.check("real payment settings put back exactly", JSON.stringify(restored) === JSON.stringify(original));
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
