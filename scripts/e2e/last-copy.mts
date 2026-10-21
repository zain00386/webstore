// npm run e2e:last-copy
// Simultaneous checkout of the LAST copy, against the real database: 6 customers
// press "Place order" at the same moment for a book with stock 1. Exactly one
// order may succeed, stock must end at 0 (never negative), the others get a
// clear "cart changed" answer. Repeated 3 times. Uses a temporary book.
import { randomBytes, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { createOrderToken } from "../../src/lib/orders/token";
import { loadScriptEnv } from "../lib/script-env";
import { reporter } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const r = reporter();
const tag = randomBytes(3).toString("hex");
const phonePrefix = `0398${String(randomInt(0, 1000)).padStart(3, "0")}`; // test-only numbers
let bookId: string | null = null;

const order = (n: number) => {
  const { hash } = createOrderToken();
  return svc.rpc("place_order", {
    p_idempotency_key: crypto.randomUUID(),
    p_access_token_hash: hash,
    p_customer: { name: `E2E Racer ${n}`, phone: `${phonePrefix}${String(n).padStart(4, "0")}`, email: "", address: "House 1, Street 2, Satellite Town", city: "Rawalpindi", notes: "" },
    p_delivery_method: "courier",
    p_payment_method: "cod",
    p_items: [{ book_id: bookId!, quantity: 1 }],
  });
};

try {
  const { data, error } = await svc.from("books").insert({ slug: `e2e-last-copy-${tag}`, title: `E2E Last Copy ${tag}`, price: 900, stock_quantity: 1, publisher: "E2E" }).select("id").single();
  if (error) throw error;
  bookId = data.id;

  for (let round = 1; round <= 3; round++) {
    await svc.from("books").update({ stock_quantity: 1 }).eq("id", bookId);
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => order(round * 10 + i)));
    const won = results.filter((x) => !x.error && x.data?.[0]?.created);
    const refused = results.filter((x) => x.error?.message.includes("CART_CHANGED"));
    const other = results.filter((x) => x.error && !x.error.message.includes("CART_CHANGED"));
    const stock = (await svc.from("books").select("stock_quantity").eq("id", bookId).single()).data?.stock_quantity;
    r.check(`round ${round}: exactly 1 of 6 simultaneous orders succeeds`, won.length === 1, `won ${won.length}, refused ${refused.length}, other errors ${other.map((x) => x.error?.message).join("; ")}`);
    r.check(`round ${round}: the other 5 are told the cart changed`, refused.length === 5);
    r.check(`round ${round}: stock ends at 0, never negative`, stock === 0, String(stock));
  }
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("orders").delete().like("customer_phone", `${phonePrefix}%`);
  if (bookId) await svc.from("books").delete().eq("id", bookId);
  r.check("test orders and book removed", ((await svc.from("orders").select("id").like("customer_phone", `${phonePrefix}%`)).data ?? []).length === 0);
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
