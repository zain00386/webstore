// npm run e2e:banner  (needs the site running on http://localhost:3000 and migration 0010)
// Admin adds a banner slide: it shows first on the home page; hidden it disappears; deleted it's gone.
// Uses a temporary admin and slide; the vacancy switch is put back afterwards.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, signIn, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-banner-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const title = `E2E Slide ${tag}`;
const r = reporter();
let userId: string | null = null;
const originalAuto = (await svc.from("store_settings").select("banner_auto_vacancies").eq("id", true).single()).data?.banner_auto_vacancies ?? true;

const home = async () => (await fetch(BASE + "/", { cache: "no-store" })).text();
const slideRow = async () => (await svc.from("banner_slides").select("*").eq("title", title).maybeSingle()).data;
const save = async (b: Browser) => {
  await b.waitFor(() => b.js<boolean>(`document.querySelectorAll('[data-sonner-toast]').length === 0`), 15000);
  await b.clickText("button", "Save slide");
  await b.waitFor(async () => (await b.url()).startsWith("/admin/banner?saved=1") || /Please fix|changed somewhere|database needs/.test(await b.text()), 30000);
  await sleep(300);
  return b.text();
};

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/banner/new");
  await b.waitForText("What the slide says", 30000);

  // 1. Unsafe link refused
  await b.fill('[name="title"]', title);
  await b.fill('[name="buttonHref"]', "javascript:alert(1)");
  let t = await save(b);
  r.check("unsafe button link is refused", t.includes("use a page of this site") && !(await slideRow()));

  // 2. Valid slide, first in order, books for an exam
  await b.fill('[name="eyebrow"]', "E2E label");
  await b.fill('textarea[name="body"]', "E2E text for the slide.");
  await b.fill('[name="buttonLabel"]', "Buy now");
  await b.fill('[name="buttonHref"]', "/books?exam=jobs");
  await b.fill('[name="sortOrder"]', "0");
  await b.js(`(() => { const s = document.querySelector('select[name="examTag"]'); s.value = 'jobs'; })()`);
  t = await save(b);
  r.check("slide saved", (await b.url()).startsWith("/admin/banner?saved=1"), t.slice(0, 200));
  const row = await slideRow();
  r.check("stored with the exam and order 0", row?.exam_tag === "jobs" && row.sort_order === 0 && row.is_active);

  // 3. Home page: our slide is the first slide
  let h = await home();
  const firstSlide = /aria-label="1 of \d+: ([^"]+)"/.exec(h)?.[1] ?? "";
  r.check("home page banner shows the slide first", firstSlide === title, firstSlide);
  r.check("slide text and button link are on the page", h.includes("E2E text for the slide.") && h.includes('href="/books?exam=jobs"'));

  // 4. Hidden -> gone from the home page
  await b.go(`/admin/banner/${row!.id}/edit`);
  await b.waitForText("Edit slide", 20000);
  await b.js(`(() => { document.querySelector('input[name="isActive"]').checked = false; })()`);
  await save(b);
  h = await home();
  r.check("hidden slide disappears from the home page", !h.includes(title) && (await slideRow())?.is_active === false);
  r.check("visitors can't read the hidden slide", ((await createClient<Database>(env.url, env.anonKey).from("banner_slides").select("id").eq("title", title)).data ?? []).length === 0);

  // 5. Vacancy switch saves
  await b.go("/admin/banner");
  await b.waitForText("Also add a slide", 20000);
  await b.js(`(() => { document.querySelector('input[name="autoVacancies"]').checked = false; })()`);
  await b.js(`[...document.querySelectorAll('form button[type="submit"]')].find((x) => x.textContent.includes("Save")).click()`);
  await b.waitFor(async () => (await svc.from("store_settings").select("banner_auto_vacancies").eq("id", true).single()).data?.banner_auto_vacancies === false, 15000);
  r.check("automatic vacancy slides can be switched off", (await svc.from("store_settings").select("banner_auto_vacancies").eq("id", true).single()).data?.banner_auto_vacancies === false);

  // 6. Delete
  await b.go(`/admin/banner/${row!.id}/edit`);
  await b.waitForText("Delete this slide", 20000);
  await b.clickText("button", "Delete slide");
  await b.waitFor(() => b.js<boolean>(`!!document.querySelector('[role="dialog"] button[type="submit"]')`), 10000);
  await b.js(`document.querySelector('[role="dialog"] button[type="submit"]').click()`);
  await b.waitForText("The slide was deleted", 20000);
  r.check("slide deleted", !(await slideRow()));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("banner_slides").delete().eq("title", title);
  await svc.from("store_settings").update({ banner_auto_vacancies: originalAuto }).eq("id", true);
  if (userId) await svc.auth.admin.deleteUser(userId);
  r.check("temporary slide and admin removed, switch restored", !(await slideRow()));
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
