// npm run e2e:a11y  (needs the site running on http://localhost:3000)
// Accessibility + layout audit of every public and admin page at phone and desktop width:
//  - axe-core (WCAG 2.2 A/AA rules + best practices)
//  - no sideways scrolling, every image has alt text, every button/link has a name
//  - no browser errors
// Uses a temporary admin. Writes a full report to e2e-a11y-report.json (git-ignored).
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { launchBrowser, signIn, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-a11y-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const only = process.argv[2]; // optional: audit only paths containing this text

type Finding = { page: string; width: number; rule: string; impact: string; help: string; targets: string[] };
const findings: Finding[] = [];

const widths = [390, 1280];

async function setWidth(b: Browser, width: number) {
  await b.send("Emulation.setDeviceMetricsOverride", { width, height: width < 800 ? 844 : 900, deviceScaleFactor: 1, mobile: width < 800 });
}

async function audit(b: Browser, path: string, width: number, prepare?: () => Promise<void>) {
  await setWidth(b, width);
  await b.go(path);
  if (prepare) await prepare();
  await b.waitFor(async () => !(await b.text()).includes("Checking prices and stock"), 15000);
  // Wait for streamed content (a page heading) instead of auditing a loading skeleton.
  await b.waitFor(() => b.js<boolean>("!!document.querySelector('h1, h2')"), 20000);
  await sleep(600);
  const logsBefore = b.logs.length;

  const custom = await b.js<{ overflow: number; noAlt: string[]; noName: string[] }>(`(() => {
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(0, 80));
    const noName = [...document.querySelectorAll('a[href], button')].filter((el) => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) return false;
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim();
      const labelled = el.getAttribute('aria-labelledby');
      return !name && !labelled && !el.querySelector('img[alt]:not([alt=""])');
    }).map((el) => el.outerHTML.slice(0, 120));
    return { overflow, noAlt, noName };
  })()`);
  if (custom.overflow > 1) findings.push({ page: path, width, rule: "horizontal-scroll", impact: "serious", help: `Page is ${custom.overflow}px wider than the screen`, targets: [] });
  if (custom.noAlt.length) findings.push({ page: path, width, rule: "img-no-alt-attr", impact: "serious", help: "Images without alt", targets: custom.noAlt });
  if (custom.noName.length) findings.push({ page: path, width, rule: "control-no-name", impact: "serious", help: "Links/buttons without a name", targets: custom.noName });

  await b.js(`(() => { if (!window.axe) { const s = document.createElement('script'); s.textContent = ${JSON.stringify(axeSource)}; document.head.appendChild(s); } })()`);
  const result = await b.js<{ id: string; impact: string; help: string; nodes: { target: string[] }[] }[]>(
    `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }, resultTypes: ['violations'] }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, why: n.failureSummary })) })))`,
  );
  for (const v of result) findings.push({ page: path, width, rule: v.id, impact: v.impact, help: v.help, targets: v.nodes.slice(0, 5).map((n) => `${n.target.join(" ")} :: ${(n as { why?: string }).why ?? ""}`) });
  for (const log of b.logs.slice(logsBefore)) findings.push({ page: path, width, rule: "browser-error", impact: "serious", help: log, targets: [] });
}

let userId: string | null = null;
try {
  const [{ data: book }, { data: post }, { data: order }] = await Promise.all([
    svc.from("books").select("id, slug, title, price, stock_quantity").eq("is_active", true).gt("stock_quantity", 0).limit(1).single(),
    svc.from("posts").select("id, slug").eq("status", "published").limit(1).maybeSingle(),
    svc.from("orders").select("id").limit(1).maybeSingle(),
  ]);
  const cartJs = `localStorage.setItem('dub-cart-v1', JSON.stringify([{ bookId: ${JSON.stringify(book!.id)}, slug: ${JSON.stringify(book!.slug)}, title: ${JSON.stringify(book!.title)}, publisher: null, coverUrl: null, price: ${book!.price}, compareAtPrice: null, maxQuantity: 9, quantity: 1 }]))`;

  const publicPages = [
    "/",
    "/books",
    "/books?exam=css-pms",
    `/books/${book!.slug}`,
    "/exams",
    "/blog",
    ...(post ? [`/blog/${post.slug}`] : []),
    "/about",
    "/contact",
    "/shipping",
    "/returns",
    "/faq",
    "/privacy",
    "/terms",
    "/orders",
    "/order-confirmation/DUB-1?t=x",
    "/this-page-does-not-exist",
  ];

  const b = await launchBrowser();
  for (const width of widths) {
    for (const p of publicPages) if (!only || p.includes(only)) await audit(b, p, width);
    if (!only || "/cart".includes(only)) await audit(b, "/cart", width, async () => (await b.js(cartJs), await b.go("/cart")));
    if (!only || "/checkout".includes(only)) await audit(b, "/checkout", width, async () => (await b.js(cartJs), await b.go("/checkout")));
    if (!only || "/admin/login".includes(only)) await audit(b, "/admin/login", width);
  }

  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });
  await signIn(b, admin.email, admin.password, "/admin");
  const adminPages = [
    "/admin",
    "/admin/books",
    "/admin/books/new",
    `/admin/books/${book!.id}/edit`,
    "/admin/categories",
    "/admin/orders",
    "/admin/orders?view=all",
    ...(order ? [`/admin/orders/${order.id}`] : []),
    "/admin/posts",
    "/admin/posts/new",
    ...(post ? [`/admin/posts/${post.id}/edit`] : []),
    "/admin/settings",
  ];
  for (const width of widths) for (const p of adminPages) if (!only || p.includes(only)) await audit(b, p, width);
  b.close();
} finally {
  if (userId) await svc.auth.admin.deleteUser(userId);
}

writeFileSync("e2e-a11y-report.json", JSON.stringify(findings, null, 2));
// Summary: one line per rule, with the pages it happens on.
const byRule = new Map<string, Finding[]>();
for (const f of findings) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
const order = ["critical", "serious", "moderate", "minor"];
const rules = [...byRule.entries()].sort((a, b) => order.indexOf(a[1][0].impact) - order.indexOf(b[1][0].impact));
for (const [rule, list] of rules) {
  const pages = [...new Set(list.map((f) => `${f.page}@${f.width}`))];
  console.log(`${list[0].impact.toUpperCase().padEnd(9)} ${rule}: ${list[0].help}`);
  console.log(`          ${pages.length} page/width(s): ${pages.slice(0, 8).join(", ")}${pages.length > 8 ? " …" : ""}`);
  console.log(`          e.g. ${list.flatMap((f) => f.targets).slice(0, 3).join(" | ")}`);
}
console.log(findings.length ? `\n${byRule.size} kinds of issue, ${findings.length} findings (full list: e2e-a11y-report.json)` : "\nNo issues found.");
process.exit(findings.some((f) => f.impact === "critical" || f.impact === "serious") ? 1 : 0);
