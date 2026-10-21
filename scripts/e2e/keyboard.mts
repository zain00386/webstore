// npm run e2e:keyboard  (needs the site running on http://localhost:3000)
// Presses Tab through key pages like a keyboard user and checks that:
//  - "Skip to content" is the first stop on shop pages,
//  - every focused element shows a visible focus indicator,
//  - focus moves forward (no traps), and the checkout form is reachable.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { launchBrowser, reporter, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const r = reporter();

type Stop = { label: string; visible: boolean };

async function tabThrough(b: Browser, presses: number): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < presses; i++) {
    await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await sleep(60);
    stops.push(
      await b.js<Stop>(`(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return { label: 'body', visible: true };
        // Next.js's developer toolbar exists only in development, never on the live site.
        if (el.tagName === 'NEXTJS-PORTAL') return { label: 'body', visible: true };
        const s = getComputedStyle(el);
        const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
        const ring = s.boxShadow && s.boxShadow !== 'none';
        // Card links draw their focus ring on ::after so it surrounds the whole card.
        const after = getComputedStyle(el, '::after');
        const afterRing = after.boxShadow && after.boxShadow !== 'none';
        // Inputs inside a styled label/card (radio cards) show focus on the card.
        const card = el.closest('label');
        const cardRing = card ? getComputedStyle(card).boxShadow !== 'none' || getComputedStyle(card).outlineStyle !== 'none' : false;
        const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
        return { label: el.tagName.toLowerCase() + ': ' + name, visible: Boolean(outline || ring || afterRing || cardRing) };
      })()`),
    );
  }
  return stops;
}

const b = await launchBrowser();
await b.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
const { data: book } = await svc.from("books").select("id, slug, title, price").eq("is_active", true).gt("stock_quantity", 0).limit(1).single();

for (const path of ["/", `/books/${book!.slug}`, "/admin/login"]) {
  await b.go(path);
  const stops = await tabThrough(b, 25);
  const real = stops.filter((s) => s.label !== "body");
  if (path !== "/admin/login") r.check(`${path}: first Tab stop is "Skip to content"`, real[0]?.label.includes("Skip to content") ?? false, real[0]?.label);
  const hidden = real.filter((s) => !s.visible);
  r.check(`${path}: all ${real.length} focus stops show a focus outline`, hidden.length === 0, hidden.map((h) => h.label).join(" | "));
  // No trap: Tab reaches as many different controls as the page has (up to 10).
  const tabbable = await b.js<number>(
    `[...document.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]') && el.tabIndex >= 0).length`,
  );
  const distinct = new Set(real.map((s) => s.label)).size;
  r.check(`${path}: focus keeps moving (no trap)`, distinct >= Math.min(10, tabbable) - 1, `${distinct} different stops, ${tabbable} controls`);
}

// Checkout: can a keyboard user reach the form fields and the Place order button?
await b.go("/");
await b.js(`localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(book!.id)}, slug: ${JSON.stringify(book!.slug)}, title: ${JSON.stringify(book!.title)}, publisher: null, coverUrl: null, price: ${book!.price}, compareAtPrice: null, maxQuantity: 9, quantity: 1 }]))`);
await b.go("/checkout");
await b.waitFor(async () => (await b.text()).includes("Place order"), 30000);
const stops = await tabThrough(b, 70);
const labels = stops.map((s) => s.label);
r.check("checkout: name, phone and address fields are reachable by Tab", ["name", "phone", "address"].every((n) => labels.some((l) => l.includes(n))), labels.join(" | ").slice(0, 400));
r.check("checkout: Place order button is reachable by Tab", labels.some((l) => l.includes("Place order")));
const hidden = stops.filter((s) => s.label !== "body" && !s.visible);
r.check("checkout: all focus stops show a focus outline", hidden.length === 0, hidden.map((h) => h.label).join(" | "));
await b.js(`localStorage.removeItem('dub-cart-v1')`);

r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
b.close();
console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
