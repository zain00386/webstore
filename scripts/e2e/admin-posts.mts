// npm run e2e:posts  (needs the site running on http://localhost:3000)
// An admin writes a vacancy: draft (hidden) -> published (visible) -> archived (hidden) -> deleted.
// Uses a temporary admin and post, then removes them.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, signIn, sleep, type Browser } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-posts-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const title = `E2E Vacancy ${tag}`;
const slug = `e2e-vacancy-${tag}`;
const r = reporter();
let userId: string | null = null;

const page = async (path: string) => {
  const res = await fetch(BASE + path, { cache: "no-store" });
  return { status: res.status, html: await res.text() };
};
const postRow = async () => (await svc.from("posts").select("id, status, published_at, excerpt").eq("slug", slug).maybeSingle()).data;
const setStatus = (b: Browser, value: string) => b.js(`(() => { const s = document.querySelector('select[name="status"]'); s.value = '${value}'; })()`);
const save = async (b: Browser) => {
  // Remove the previous result message so we only read the new one.
  await b.js(`document.querySelectorAll('[role="alert"], [role="status"]').forEach((el) => el.remove())`);
  await b.clickText("button", "Save post");
  await b.waitFor(async () => /Saved\.|Please fix|changed since/.test(await b.text()), 30000);
  await sleep(300);
  return b.text();
};

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/posts/new");
  await b.waitForText("Type of post", 30000);

  // 1. Missing organisation and a bad link are refused
  await b.fill('[name="title"]', title);
  await sleep(200);
  await b.fill('textarea[name="body"]', "## Eligibility\n- Masters degree\n\n<script>alert('x')</script> **Apply early.** [Unsafe](javascript:alert(1))");
  await b.fill('[name="applyUrl"]', "http://not-secure.example.com");
  let t = await save(b);
  r.check("organisation required and http link refused", t.includes("Which organisation is hiring?") && t.includes("starting with https://"));
  r.check("nothing saved yet", !(await postRow()));

  // 2. Save as draft
  await b.fill('[name="vacancyOrganisation"]', "E2E Commission");
  await b.fill('[name="vacancyLastDate"]', "2026-12-31");
  await b.fill('[name="applyUrl"]', "https://www.example.gov.pk/apply");
  await b.js(`(() => { const s = document.querySelector('select[name="examTag"]'); s.value = 'css-pms'; })()`);
  t = await save(b);
  r.check("draft saved", t.includes("Only admins can see it"), t.slice(0, 200));
  let row = await postRow();
  r.check("draft has no publish date and an automatic summary", row?.status === "draft" && row.published_at === null && row.excerpt.startsWith("Eligibility Masters degree"));
  r.check("draft is not on the public site", (await page(`/blog/${slug}`)).html.includes("Post not found") && !(await page("/blog")).html.includes(title));

  // 3. Preview tab renders the text safely
  await b.clickText("button", "Preview");
  await sleep(300);
  const previewHtml = await b.js<string>(`document.querySelector('[role="tabpanel"]')?.innerHTML ?? ''`);
  r.check("preview shows formatting, script only as text", previewHtml.includes("<h2") && previewHtml.includes("&lt;script&gt;") && !previewHtml.includes("javascript:"));
  await b.clickText("button", "Write");

  // 4. Publish
  await setStatus(b, "published");
  t = await save(b);
  r.check("published", t.includes("The post is live on the site"));
  for (let i = 0; i < 3; i++) r.info(`probe ${i}: ${(await page(`/blog/${slug}`)).html.includes("Post not found") ? "not found" : "found"}`);
  const pub = await page(`/blog/${slug}`);
  r.check("post page shows title, organisation and safe apply link", pub.html.includes(title) && pub.html.includes("E2E Commission") && pub.html.includes('href="https://www.example.gov.pk/apply"'), `title:${pub.html.includes(title)} org:${pub.html.includes("E2E Commission")} link:${pub.html.includes('href="https://www.example.gov.pk/apply"')} notfound:${pub.html.includes("Post not found")}`);
  const at = pub.html.indexOf("<script>alert");
  r.check("script text is shown as text, unsafe link dropped", at < 0 && !pub.html.includes('href="javascript:'), at >= 0 ? pub.html.slice(Math.max(0, at - 200), at + 60) : "");
  const listAll = (await page("/blog")).html.includes(title);
  const listVac = (await page("/blog?type=vacancy")).html.includes(title);
  r.check("listed on /blog and under Vacancies", listAll && listVac, `all:${listAll} vacancies:${listVac}`);
  r.check("shown on the home page", (await page("/")).html.includes(title));

  // 5. Scheduled in the future -> hidden until then
  await b.fill('[name="publishedAt"]', "2030-01-01T10:00");
  t = await save(b);
  r.check("future date: saved as scheduled and hidden", t.includes("at the publish time") && (await page(`/blog/${slug}`)).html.includes("Post not found"));
  await b.fill('[name="publishedAt"]', "");
  await save(b);

  // 6. Archive -> hidden again
  await setStatus(b, "archived");
  t = await save(b);
  r.check("archived post is hidden from the site", (await postRow())?.status === "archived" && !(await page("/blog")).html.includes(title));

  // 7. Admin list shows it under Archived
  await b.go("/admin/posts?status=archived");
  await b.waitForText(title, 20000);
  r.check("admin list filters archived posts", (await b.text()).includes(title));

  // 8. Delete (needs DELETE)
  row = await postRow();
  await b.go(`/admin/posts/${row!.id}/edit`);
  await b.waitForText("Delete this post", 20000);
  await b.clickText("button", "Delete permanently");
  await b.waitFor(async () => b.js<boolean>(`!!document.querySelector('#confirm-delete')`), 10000);
  await b.fill("#confirm-delete", "DELETE");
  await b.js(`[...document.querySelectorAll('[role="dialog"] button[type="submit"]')][0].click()`);
  await b.waitForText("The post was deleted", 20000);
  r.check("post deleted", !(await postRow()));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  await svc.from("posts").delete().eq("slug", slug);
  if (userId) await svc.auth.admin.deleteUser(userId);
  r.check("temporary post and admin removed", !(await postRow()));
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
