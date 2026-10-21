// npm run e2e:admin-orders  (needs the site running on http://localhost:3000 and migrations 0005 + 0006)
// An admin works through real orders in the browser: confirm, verify payment, ship,
// deliver, cancel (stock back once). Uses a temporary admin, book and orders.
import { randomBytes, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { createOrderToken } from "../../src/lib/orders/token";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, signIn, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-orders-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const slug = `e2e-admin-order-book-${tag}`;
const phone = `0399${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
const r = reporter();
let userId: string | null = null;
let bookId: string | null = null;

const stock = async () => (await svc.from("books").select("stock_quantity").eq("id", bookId!).single()).data!.stock_quantity;
const orderRow = async (id: string) => (await svc.from("orders").select("status, payment_status, tracking_number, shipped_via, stock_restored_at").eq("id", id).single()).data!;

/** Places an order exactly like the website server does. */
async function place(payment: "cod" | "jazzcash", delivery: "courier" | "pakistan_post", quantity: number) {
  const { token, hash } = createOrderToken();
  const { data, error } = await svc.rpc("place_order", {
    p_idempotency_key: crypto.randomUUID(),
    p_access_token_hash: hash,
    p_customer: { name: "E2E Admin Customer", phone, email: "", address: "House 9, Street 9, Satellite Town", city: "Rawalpindi", notes: "Please call first" },
    p_delivery_method: delivery,
    p_payment_method: payment,
    p_items: [{ book_id: bookId!, quantity }],
  });
  if (error) throw error;
  return { id: data[0].order_id, number: data[0].order_number, token };
}

async function openOrder(b: Browser, id: string) {
  await b.go(`/admin/orders/${id}`);
  await b.waitForText("What next?", 30000);
}
/** Clicks a button by its text and waits for the page to show the result. */
async function press(b: Browser, label: string, expect: string | RegExp) {
  await b.clickText("button", label);
  return b.waitForText(expect, 20000);
}
const dialogSubmit = (b: Browser, label: string) =>
  b.js(`[...document.querySelectorAll('[role="dialog"] button[type="submit"]')].find(x => x.textContent.includes(${JSON.stringify(label)}))?.click()`);

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });
  const book = await svc.from("books").insert({ slug, title: `E2E Admin Order Book ${tag}`, price: 500, stock_quantity: 10, publisher: "E2E" }).select("id").single();
  if (book.error) throw book.error;
  bookId = book.data.id;

  const cod = await place("cod", "courier", 2);
  const jazz = await place("jazzcash", "pakistan_post", 1);
  const toCancel = await place("cod", "courier", 3);
  r.check("three test orders placed, stock 10 → 4", (await stock()) === 4);

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/orders");
  await b.waitForText("Orders", 30000);

  // List: "Needs action" shows them; search by phone finds exactly these
  await b.go(`/admin/orders?view=all&q=${phone}`);
  await b.waitForText(cod.number, 20000);
  let t = await b.text();
  r.check("search by phone finds the test orders", [cod.number, jazz.number, toCancel.number].every((n) => t.includes(n)) && t.includes("3 orders"));
  await b.go(`/admin/orders?view=verify&q=${phone}`);
  await b.waitForText("order", 20000);
  t = await b.text();
  r.check("'Payments to verify' shows the JazzCash order only", t.includes(jazz.number) && !t.includes(cod.number));
  await b.go(`/admin/orders?q=${encodeURIComponent("x),status.eq.delivered")}`);
  await b.waitForText("Orders", 20000);
  r.check("odd search text doesn't break the page", (await b.text()).includes("No orders found") && b.logs.length === 0);

  // COD order: confirm -> pack -> ship (with tracking) -> deliver -> cash received
  await openOrder(b, cod.id);
  t = await b.text();
  r.check("order page shows customer, note and items", t.includes("E2E Admin Customer") && t.includes("Please call first") && t.includes("× 2"));
  r.check("COD order can't be marked paid before shipping", !t.includes("Mark paid"));
  await press(b, "Confirm order", "Mark packed");
  r.check("confirm → Confirmed", (await orderRow(cod.id)).status === "confirmed");
  await press(b, "Mark packed", "Mark shipped");
  await b.clickText("button", "Mark shipped");
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('[role="dialog"] select[name="shippedVia"]')`), 10000);
  await b.js(`(() => { const s = document.querySelector('[role="dialog"] select[name="shippedVia"]'); s.value = 'M&P'; })()`);
  await b.fill('[role="dialog"] input[name="trackingNumber"]', "MP-778899");
  await dialogSubmit(b, "Mark shipped");
  await b.waitForText("Mark delivered", 20000);
  let row = await orderRow(cod.id);
  r.check("shipped with courier and tracking number saved", row.status === "shipped" && row.shipped_via === "M&P" && row.tracking_number === "MP-778899", JSON.stringify(row));
  r.check("shipping didn't touch payment", row.payment_status === "pending");
  const customerPage = await (await fetch(`${BASE}/order-confirmation/${cod.number}?t=${cod.token}`)).text();
  r.check("customer page shows M&P and the tracking number", customerPage.includes("M&amp;P") && customerPage.includes("MP-778899"));
  await press(b, "Mark delivered", "Mark paid");
  await b.clickText("button", "Mark paid");
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('[role="dialog"] input[type="checkbox"]')`), 10000);
  await dialogSubmit(b, "Mark paid"); // checkbox not ticked: the browser blocks it
  await sleep(1000);
  r.check("'Mark paid' needs the confirmation tick", (await orderRow(cod.id)).payment_status === "pending");
  await b.click('[role="dialog"] input[type="checkbox"]');
  await dialogSubmit(b, "Mark paid");
  await b.waitFor(async () => (await orderRow(cod.id)).payment_status === "paid", 20000);
  row = await orderRow(cod.id);
  r.check("delivered and paid", row.status === "delivered" && row.payment_status === "paid");
  await b.waitForText("Order placed on the website", 10000);
  t = await b.text();
  r.check("history lists every step", ["Confirm order", "Mark packed", "Mark shipped", "Mark delivered", "Mark paid"].every((s) => t.includes(s)));

  // JazzCash order: can't ship until marked paid
  await openOrder(b, jazz.id);
  await press(b, "Confirm order", "Mark packed");
  t = await b.text();
  r.check("unpaid JazzCash order has no 'Mark shipped' button", !t.includes("Mark shipped") && t.includes("before shipping"));
  await b.clickText("button", "Mark paid");
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('[role="dialog"] input[type="checkbox"]')`), 10000);
  t = await b.text();
  r.check("'Mark paid' warns a screenshot isn't enough", t.includes("screenshot alone is not enough"));
  await b.click('[role="dialog"] input[type="checkbox"]');
  await dialogSubmit(b, "Mark paid");
  await b.waitForText("Mark shipped", 20000);
  r.check("after payment it can be shipped", (await orderRow(jazz.id)).payment_status === "paid");

  // Cancel: needs a reason, stock goes back exactly once
  await openOrder(b, toCancel.id);
  await b.clickText("button", "Cancel order");
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('[role="dialog"] textarea[name="note"]')`), 10000);
  await b.fill('[role="dialog"] textarea[name="note"]', "Customer changed their mind");
  await dialogSubmit(b, "Cancel order");
  await b.waitFor(async () => (await orderRow(toCancel.id)).status === "cancelled", 20000);
  r.check("cancelled; 3 copies back in stock (4 → 7)", (await stock()) === 7);
  await b.waitForText("Stock returned", 20000);
  t = await b.text();
  r.check("cancelled order offers no second cancel", !t.includes("Cancel order…") && (await stock()) === 7);

  // Stale tab: page loaded before someone else changed the order
  await openOrder(b, jazz.id);
  const before = (await svc.from("orders").select("updated_at").eq("id", jazz.id).single()).data!.updated_at;
  // another admin ships it meanwhile (via a fresh page in the same session)
  const b2 = await launchBrowser();
  await signIn(b2, admin.email, admin.password, `/admin/orders/${jazz.id}`);
  await b2.waitForText("What next?", 30000);
  await b2.clickText("button", "Mark shipped");
  await b2.waitFor(async () => b2.js<boolean>(`!!document.querySelector('[role="dialog"] select')`), 10000);
  await dialogSubmit(b2, "Mark shipped");
  await b2.waitFor(async () => (await orderRow(jazz.id)).status === "shipped", 20000);
  b2.close();
  r.check("order changed by the other tab", (await svc.from("orders").select("updated_at").eq("id", jazz.id).single()).data!.updated_at !== before);
  await b.clickText("button", "Cancel order"); // the old tab still shows "Cancel"
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('[role="dialog"] textarea[name="note"]')`), 10000);
  await b.fill('[role="dialog"] textarea[name="note"]', "old tab");
  await dialogSubmit(b, "Cancel order");
  await b.waitForText("another tab", 20000);
  r.check("stale tab is told to check again, order stays shipped", (await orderRow(jazz.id)).status === "shipped");

  // Dashboard link
  await b.go("/admin");
  await b.waitForText("Payments to verify", 20000);
  r.check("overview links to payments to verify", await b.js<boolean>(`!!document.querySelector('a[href="/admin/orders?view=verify"]')`));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("orders").delete().eq("customer_phone", phone);
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  if (userId) await svc.auth.admin.deleteUser(userId);
  r.check("test orders, book and admin removed", (await svc.from("orders").select("id").eq("customer_phone", phone)).data?.length === 0);
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
