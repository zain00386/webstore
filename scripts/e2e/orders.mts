// npm run e2e:orders  (needs the site running on http://localhost:3000 and migration 0004)
// Places real test orders through the checkout page, then removes them.
import { randomBytes, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const slug = `e2e-order-book-${tag}`;
const title = `E2E Order Book ${tag}`;
const phone = `0399${String(randomInt(0, 10_000_000)).padStart(7, "0")}`; // test-only number
const r = reporter();
let bookId: string | null = null;

const ordersForPhone = async () =>
  (await svc.from("orders").select("id, order_number, total, payment_method, payment_status, status, delivery_fee").eq("customer_phone", phone).order("created_at")).data ?? [];
const stock = async () => (await svc.from("books").select("stock_quantity").eq("id", bookId!).single()).data?.stock_quantity;

async function seedCart(b: Browser, quantity: number, price = 1) {
  await b.js(
    `localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(bookId)}, slug: ${JSON.stringify(slug)}, title: 'stale title', publisher: null, coverUrl: null, price: ${price}, compareAtPrice: null, maxQuantity: 9, quantity: ${quantity} }]))`,
  );
}

async function fillCheckout(b: Browser, delivery: "courier" | "pakistan_post", payment: "cod" | "jazzcash") {
  await b.go("/checkout");
  await b.waitFor(async () => (await b.text()).includes("Place order"), 30000);
  await b.fill('[name="name"]', "E2E Customer");
  await b.fill('[name="phone"]', phone);
  await b.fill('textarea[name="address"]', "House 1, Street 2, Satellite Town");
  await b.fill('[name="city"]', "Rawalpindi");
  await b.click(`input[name="deliveryMethod"][value="${delivery}"]`);
  await sleep(200);
  await b.click(`input[name="paymentMethod"][value="${payment}"]`);
  await sleep(200);
}

try {
  const { data, error } = await svc.from("books").insert({ slug, title, price: 700, stock_quantity: 2, publisher: "E2E" }).select("id").single();
  if (error) throw error;
  bookId = data.id;
  const b = await launchBrowser();
  await b.go("/");

  // 1. COD order via TCS/Leopards; the browser's stored price (Rs. 1) is ignored
  await seedCart(b, 1, 1);
  await fillCheckout(b, "courier", "cod");
  await b.clickText("button", "Place order");
  await b.waitFor(async () => (await b.url()).startsWith("/order-confirmation/DUB-"), 40000);
  const confUrl = await b.url();
  r.check("order placed and confirmation opens", confUrl.startsWith("/order-confirmation/DUB-"), confUrl);
  await b.waitForText("Thank you, your order is placed", 20000);
  const conf = await b.text();
  r.check("confirmation shows total from database prices (700 + 550)", conf.includes("Rs. 1,250"));
  r.check("confirmation shows cash on delivery next step", conf.includes("Pay in cash when your books arrive"));
  let orders = await ordersForPhone();
  r.check("one order stored", orders.length === 1, JSON.stringify(orders));
  r.check("order total and fee are correct", orders[0]?.total === 1250 && orders[0]?.delivery_fee === 550, JSON.stringify(orders[0]));
  r.check("payment and order status are separate and pending", orders[0]?.payment_status === "pending" && orders[0]?.status === "pending");
  const items = (await svc.from("order_items").select("title_snapshot, unit_price, quantity").eq("order_id", orders[0]!.id)).data;
  r.check("item snapshot uses the real title and price", items?.[0]?.title_snapshot === title && items?.[0]?.unit_price === 700, JSON.stringify(items));
  r.check("stock went down by one", (await stock()) === 1);
  r.check("cart was emptied", (await b.js<string>(`localStorage.getItem('dub-cart-v1')`)) === "[]");

  // 2. The order page needs the secret link
  const [path, query] = confUrl.split("?");
  const noToken = await (await fetch(BASE + path)).text();
  const badToken = await (await fetch(`${BASE}${path}?t=${"x".repeat(43)}`)).text();
  r.check("without the secret link: order not found", noToken.includes("Order not found") && !noToken.includes("E2E Customer"));
  r.check("with a wrong secret: order not found", badToken.includes("Order not found") && !badToken.includes("Satellite Town"));
  const good = await (await fetch(`${BASE}${path}?${query}`)).text();
  r.check("with the right link: order shows", good.includes("Satellite Town"));

  // 3. Shop shows the new stock straight away
  await b.go(`/books/${slug}`);
  r.check("shop page shows the updated stock (still in stock: 1 left)", (await b.text()).includes("In stock"));

  // 4. JazzCash with Pakistan Post, double-clicked: exactly ONE order
  await b.go("/");
  await seedCart(b, 1);
  await fillCheckout(b, "pakistan_post", "jazzcash");
  await b.js(`(() => { const btn = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Place order')); btn.click(); btn.click(); btn.click(); })()`);
  await b.waitFor(async () => (await b.url()).startsWith("/order-confirmation/DUB-"), 40000);
  await b.waitForText("Thank you, your order is placed", 20000);
  const conf2 = await b.text();
  r.check("transfer order shows 'Payment pending verification'", conf2.includes("Payment pending verification"));
  r.check("transfer order total uses Rs. 300 Pakistan Post fee", conf2.includes("Rs. 1,000"));
  await sleep(1500);
  orders = await ordersForPhone();
  r.check("triple-click created exactly one more order", orders.length === 2, String(orders.length));
  r.check("stock is now 0 (not negative)", (await stock()) === 0);

  // 5. Out of stock: checkout refuses
  await b.go("/");
  await seedCart(b, 1);
  await b.go("/checkout");
  await b.waitFor(async () => !(await b.text()).includes("Checking prices and stock"), 30000);
  r.check("sold-out book can't be ordered", (await b.text()).includes("Remove unavailable books first"));
  r.check("still exactly two orders", (await ordersForPhone()).length === 2);
  await b.go(`/books/${slug}`);
  r.check("shop page shows Out of stock", (await b.text()).includes("Out of stock"));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("orders").delete().eq("customer_phone", phone);
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  r.check("test orders and book removed", (await ordersForPhone()).length === 0 && !(await svc.from("books").select("id").eq("slug", slug).maybeSingle()).data);
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
