// npm run e2e:admin  (needs the site running on http://localhost:3000)
// End-to-end test of admin login security against the real Supabase project.
// Creates two throwaway accounts, tests every path in headless Edge, then deletes them.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(4).toString("hex");
const admin = { email: `e2e-admin-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const plain = { email: `e2e-user-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const results: string[] = [];
const check = (name: string, ok: boolean, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ids: string[] = [];

async function cleanup() {
  for (const id of ids) await svc.auth.admin.deleteUser(id);
}

try {
  // ---- accounts ----
  for (const acct of [admin, plain]) {
    const { data, error } = await svc.auth.admin.createUser({ email: acct.email, password: acct.password, email_confirm: true });
    if (error) throw error;
    ids.push(data.user.id);
  }
  await svc.from("admin_users").insert({ user_id: ids[0], note: "e2e temp" });

  // ---- 1. Plain HTTP, no session ----
  for (const path of ["/admin", "/admin/books", "/admin/settings"]) {
    const res = await fetch(BASE + path, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    check(`signed-out ${path} redirects to login`, res.status >= 300 && res.status < 400 && loc.includes("/admin/login"), `${res.status} ${loc}`);
    const body = res.status === 200 ? await res.text() : "";
    check(`signed-out ${path} leaks no admin data`, !body.includes("Books on sale"));
  }
  const loginRes = await fetch(BASE + "/admin/login");
  check("login page is public", loginRes.status === 200);
  check("login page noindex header", (loginRes.headers.get("x-robots-tag") ?? "").includes("noindex"));
  check("no public sign-up page", (await fetch(BASE + "/admin/signup", { redirect: "manual" })).status !== 200);
  const crossSite = await fetch(BASE + "/admin/login/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://evil.example.com" },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  check("sign-in from another website is rejected", crossSite.status === 403, String(crossSite.status));
  const noOrigin = await fetch(BASE + "/admin/login/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  check("sign-in without an origin is rejected", noOrigin.status === 403, String(noOrigin.status));

  // Login cookie protections and page safety headers (Phase 14)
  const goodLogin = await fetch(BASE + "/admin/login/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: admin.email, password: admin.password }),
  });
  const setCookies = goodLogin.headers.getSetCookie().filter((c) => c.startsWith("sb-"));
  check("login cookie is set", goodLogin.ok && setCookies.length > 0, String(goodLogin.status));
  check("login cookie is HttpOnly and SameSite=Lax", setCookies.length > 0 && setCookies.every((c) => /HttpOnly/i.test(c) && /SameSite=Lax/i.test(c)), setCookies.join(" || ").replace(/=[^;]{20,}/g, "=…"));
  check("login cookie lasts 7 days, not 400", setCookies.every((c) => /Max-Age=604800/i.test(c)));
  if (process.env.E2E_PRODUCTION) check("login cookie is Secure on the production build", setCookies.every((c) => /Secure/i.test(c)));
  const home = await fetch(BASE + "/");
  check(
    "pages send safety headers",
    home.headers.get("x-frame-options") === "DENY" && home.headers.get("x-content-type-options") === "nosniff" && !home.headers.get("x-powered-by"),
  );

  // ---- browser ----
  const port = 9600 + Math.floor(Math.random() * 300);
  const proc = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "edge-adm-"))}`, "about:blank"], { stdio: "ignore" });
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !target; i++) {
    try { target = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === "page"); } catch {}
    if (!target) await sleep(200);
  }
  const ws = new WebSocket(target!.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map<number, (m: unknown) => void>();
  ws.addEventListener("message", (e) => { const m = JSON.parse(String(e.data)); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); } });
  const send = (method: string, params = {}) => new Promise<{ result: { result: { value: unknown } } }>((res) => { const n = ++id; pending.set(n, res as never); ws.send(JSON.stringify({ id: n, method, params })); });
  const js = async <T,>(expr: string) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value as T;
  const go = async (path: string) => { await send("Page.navigate", { url: BASE + path }); await sleep(3500); };
  const text = () => js<string>("document.body.innerText");
  const url = () => js<string>("location.pathname + location.search");
  const waitFor = async (fn: () => Promise<boolean>, ms = 15000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await sleep(300);
    }
    return false;
  };
  const clickButton = async (label: string) => {
    await waitFor(() => js<boolean>(`[...document.querySelectorAll('button')].some(b => b.textContent.includes(${JSON.stringify(label)}))`));
    await js(`[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(label)})).click()`);
  };
  const login = async (email: string, password: string) => {
    await waitFor(() => js<boolean>(`!!document.querySelector('[name="password"]')`));
    await js(`(() => {
      const set = (n, v) => { const el = document.querySelector('[name="' + n + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('email', ${JSON.stringify(email)}); set('password', ${JSON.stringify(password)});
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Sign in')).click();
    })()`);
    // Wait until the form answered (an error/notice appeared) or we left the login page.
    await waitFor(async () => {
      const t = await text();
      return !(await url()).startsWith("/admin/login") || /Incorrect|Too many|admin access|Please/.test(t);
    });
    await sleep(500);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(String(e.data));
    if (m.method === "Runtime.exceptionThrown") results.push(`INFO   browser exception: ${String(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 200)}`);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") results.push(`INFO   console.error: ${m.params.args.map((a: { value?: string; description?: string }) => a.value ?? a.description).join(" ").slice(0, 200)}`);
  });

  // 2. Wrong password
  await go("/admin/login");
  await login(admin.email, "wrong-password-123");
  await waitFor(async () => /Incorrect email or password|Too many|went wrong/.test(await text()), 15000);
  check("wrong password rejected", (await text()).includes("Incorrect email or password"), (await text()).slice(0, 300));
  check("unknown email gets the same message", await (async () => { await go("/admin/login"); await login(`nobody-${tag}@example.com`, "x"); return (await text()).includes("Incorrect email or password"); })());

  // 3. Non-admin account
  await go("/admin/login");
  await login(plain.email, plain.password);
  check("non-admin is refused", (await text()).includes("doesn't have admin access"));
  await go("/admin");
  check("non-admin is not left signed in (redirected to login)", (await url()).startsWith("/admin/login"));

  // 4. Admin account + safe "next"
  await go("/admin/login?next=https%3A%2F%2Fevil.example.com");
  await login(admin.email, admin.password);
  check("admin lands in /admin, external 'next' ignored", (await url()) === "/admin", await url());
  const started = Date.now();
  await waitFor(async () => (await text()).includes("Books on sale"), 30000);
  const overview = await text();
  check("overview shows live book count", /Books on sale\s*\n?\s*\d+/.test(overview), `after ${Date.now() - started}ms; page: ${overview.slice(0, 160).replace(/\n/g, " ")}`);
  check("header shows admin email", overview.includes(admin.email));
  await go("/admin/settings");
  check("admin can open other admin pages", (await text()).includes("Settings"));
  await go("/admin/login");
  check("signed-in admin visiting login is sent to /admin", (await url()) === "/admin");

  // 5. Sign out (retry the click until the page reacts: slow dev hydration)
  for (let i = 0; i < 5 && !(await text()).includes("You have signed out"); i++) {
    await clickButton("Sign out");
    await waitFor(async () => (await text()).includes("You have signed out"), 6000);
  }
  check("sign out shows confirmation", (await text()).includes("You have signed out"));
  await go("/admin/books");
  check("after sign out, admin pages redirect to login", (await url()).startsWith("/admin/login"));
  check("redirect remembers where you were going", (await url()).includes("next=%2Fadmin%2Fbooks"), await url());

  // 6. Login with a valid internal next
  await login(admin.email, admin.password);
  check("login returns to the page you wanted", (await url()) === "/admin/books", await url());
  for (let i = 0; i < 5 && !(await text()).includes("You have signed out"); i++) {
    await clickButton("Sign out");
    await waitFor(async () => (await text()).includes("You have signed out"), 6000);
  }

  // Rate limiting is covered deterministically by src/lib/auth/sign-in.test.ts.
  ws.close();
  proc.kill();
} catch (e) {
  results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await cleanup();
  const left = await svc.auth.admin.listUsers({ perPage: 200 });
  check("temporary accounts deleted", !left.data.users.some((u) => u.email?.includes(`-${tag}@`)));
}

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL") || r.startsWith("ERROR")) ? 1 : 0);
