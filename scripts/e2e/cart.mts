// npm run e2e:cart  (needs the site running on http://localhost:3000)
// The cart must follow the database: price changes, lower stock, out-of-stock and
// hidden books, and tampered browser data. Uses a temporary "E2E" book.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { launchBrowser, reporter, sleep } from "./lib";
import { clearOrderRateLimits } from "./lib";

const env = loadScriptEnv();
await clearOrderRateLimits(env.url, env.serviceKey);
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const slug = `e2e-cart-book-${tag}`;
const title = `E2E Cart Book ${tag}`;
const r = reporter();
let bookId: string | null = null;

const setBook = async (patch: Database["public"]["Tables"]["books"]["Update"]) => {
  const { error } = await svc.from("books").update(patch).eq("id", bookId!);
  if (error) r.info(`setBook ${JSON.stringify(patch)} failed: ${error.message}`);
};

try {
  const { data, error } = await svc.from("books").insert({ slug, title, price: 1000, stock_quantity: 5, publisher: "E2E" }).select("id").single();
  if (error) throw error;
  bookId = data.id;

  const b = await launchBrowser();
  const cartText = async () => {
    await b.go("/cart");
    await b.waitFor(async () => !(await b.text()).includes("Checking prices and stock"), 20000);
    await sleep(500);
    return b.text();
  };
  const storedLine = () => b.js<{ price: number; quantity: number; status?: string } | null>(`(JSON.parse(localStorage.getItem('dub-cart-v1') || '[]')[0] ?? null)`);

  // The book was inserted directly (not via admin, which refreshes the shop at once),
  // so wait for the shop's 1-minute catalogue cache to include it.
  const listed = await b.waitFor(async () => (await (await fetch(`http://localhost:3000/books/${slug}`)).text()).includes("Add to cart"), 120000);
  r.check("new book appears in the shop", listed);

  // 1. Real "Add to cart" from the book page stores the book id
  await b.go(`/books/${slug}`);
  await b.clickText("button", "Add to cart");
  await b.waitForText("Added to cart");
  const added = await b.js<{ bookId?: string } | null>(`(JSON.parse(localStorage.getItem('dub-cart-v1') || '[]')[0] ?? null)`);
  r.check("add to cart stores the permanent book id", added?.bookId === bookId);

  // put 3 in the cart
  await b.js(`(() => { const c = JSON.parse(localStorage.getItem('dub-cart-v1')); c[0].quantity = 3; localStorage.setItem('dub-cart-v1', JSON.stringify(c)); })()`);
  let t = await cartText();
  r.check("cart with valid book needs no changes", !t.includes("Your cart was updated") && t.includes("Proceed to checkout"));

  // 2. Price raised in the shop -> cart shows new price with a notice
  await setBook({ price: 1200 });
  t = await cartText();
  r.check("price change is announced", t.includes("price changed from Rs. 1,000 to Rs. 1,200"), t.slice(0, 300));
  r.check("cart now uses the new price", (await storedLine())?.price === 1200 && t.includes("Rs. 3,600"));

  // 3. Stock lowered below the cart quantity -> quantity reduced
  await setBook({ stock_quantity: 2 });
  t = await cartText();
  r.check("lower stock reduces the quantity", t.includes("only 2 left") && (await storedLine())?.quantity === 2);

  // 4. Tampered price in browser storage is corrected
  await b.js(`(() => { const c = JSON.parse(localStorage.getItem('dub-cart-v1')); c[0].price = 1; localStorage.setItem('dub-cart-v1', JSON.stringify(c)); })()`);
  t = await cartText();
  r.check("tampered price is replaced by the real one", (await storedLine())?.price === 1200 && !t.includes("Rs. 2\n"));

  // 5. Out of stock -> flagged, checkout blocked (cart and checkout page)
  await setBook({ stock_quantity: 0 });
  t = await cartText();
  r.check("out-of-stock book is flagged", t.includes("is now out of stock") && (await storedLine())?.status === "out_of_stock");
  r.check("checkout is blocked from the cart", t.includes("Remove unavailable books first"));
  await b.go("/checkout");
  await b.waitFor(async () => !(await b.text()).includes("Checking prices and stock"), 20000);
  r.check(
    "checkout page also blocks the order",
    await b.js<boolean>(`[...document.querySelectorAll('button')].some(x => x.textContent.includes('Remove unavailable books first') && x.disabled)`),
  );

  // 6. Back in stock -> unblocked automatically
  await setBook({ stock_quantity: 4 });
  t = await cartText();
  r.check("back in stock unblocks the cart", !(await storedLine())?.status && t.includes("Proceed to checkout"));

  // 7. Hidden from the shop -> no longer available
  await setBook({ is_active: false });
  t = await cartText();
  r.check("hidden book is flagged as no longer available", t.includes("is no longer available") && (await storedLine())?.status === "unavailable");

  // 8. Remove it -> empty cart
  await b.clickText("button", "Remove from cart");
  await b.waitForText("Your cart is empty");
  r.check("removing it empties the cart", (await b.text()).includes("Your cart is empty"));

  // 9. Checkout shows the database price, not the (tampered) one in browser storage
  await setBook({ is_active: true, stock_quantity: 4, price: 1500 });
  await b.js(`localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(bookId)}, slug: ${JSON.stringify(slug)}, title: 'x', publisher: null, coverUrl: null, price: 5, compareAtPrice: null, maxQuantity: 9, quantity: 1 }]))`);
  await b.go("/checkout");
  await b.waitFor(async () => (await b.text()).includes("Place order ·"), 30000);
  const button = await b.js<string>(`[...document.querySelectorAll('button')].find(x => x.textContent.includes('Place order'))?.textContent ?? ''`);
  r.check("checkout total uses the database price (1,500 + 550 courier)", button.includes("Rs. 2,050"), button);

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  r.check("temporary book removed", !(await svc.from("books").select("id").eq("slug", slug).maybeSingle()).data);
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
