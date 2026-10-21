// npm run e2e:books  (needs the site running on http://localhost:3000)
// End-to-end test of book & category management against the real Supabase project.
// Uses a temporary admin, a test book and a test category (all named "E2E"), then removes them.
import { randomBytes } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { loadScriptEnv } from "../lib/script-env";
import { BASE, launchBrowser, reporter, signIn, sleep } from "./lib";

const env = loadScriptEnv();
const svc = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false } });
const tag = randomBytes(3).toString("hex");
const admin = { email: `e2e-books-${tag}@example.com`, password: randomBytes(18).toString("base64url") };
const title = `E2E Test Book ${tag}`;
const slug = `e2e-test-book-${tag}`;
const catName = `E2E Cat ${tag}`;
const r = reporter();
let userId: string | null = null;

const dir = mkdtempSync(join(tmpdir(), "e2e-files-"));
const realPng = join(dir, "cover.png");
writeFileSync(realPng, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
const fakePng = join(dir, "fake.png");
writeFileSync(fakePng, "<html><script>alert(1)</script></html>");

const shopHtml = async (path: string) => (await fetch(BASE + path, { cache: "no-store" })).text();
const pageTitle = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
const bookRow = async () => (await svc.from("books").select("*").eq("slug", slug).maybeSingle()).data;

try {
  const { data, error } = await svc.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
  await svc.from("admin_users").insert({ user_id: userId, note: "e2e temp" });

  const b = await launchBrowser();
  await signIn(b, admin.email, admin.password, "/admin/books");

  // 1. Books list
  await b.waitForText("Save changes");
  r.check("books list loads with the quick-edit table", /\d+ books ·/.test(await b.text()));

  // 2. Add a book with a cover
  await b.go("/admin/books/new");
  await b.fill('[name="title"]', title);
  await sleep(300);
  r.check("web address is made from the title", (await b.js<string>(`document.querySelector('[name="slug"]').value`)) === slug);
  await b.fill('[name="price"]', "999");
  await b.fill('[name="compareAtPrice"]', "1200");
  await b.fill('[name="stockQuantity"]', "5");
  await b.fill('textarea[name="description"]', "Line one\n• First point");
  await b.click('input[name="examTags"][value="css"]');
  await b.setFile('input[name="cover"]', realPng);
  await b.clickText("button", "Add book");
  await b.waitFor(async () => /\/admin\/books\/[0-9a-f-]{36}\/edit\?saved=1/.test(await b.url()), 30000);
  r.check("new book saved and opens its edit page", (await b.text()).includes("Saved."), await b.url());
  const created = await bookRow();
  r.check("book stored with the right values", created?.price === 999 && created?.compare_at_price === 1200 && created?.stock_quantity === 5 && created?.exam_tags.includes("css"), JSON.stringify(created));
  r.check("cover stored in our bucket", Boolean(created?.cover_image_path?.startsWith("books/")), String(created?.cover_image_path));
  const coverUrl = `${env.url}/storage/v1/object/public/book-covers/${created?.cover_image_path}`;
  const coverRes = await fetch(coverUrl);
  r.check("cover is publicly viewable as a PNG", coverRes.ok && coverRes.headers.get("content-type") === "image/png", `${coverRes.status}`);

  // 3. Shop shows it immediately
  const html1 = await shopHtml(`/books/${slug}`);
  r.check("shop shows the new book immediately", html1.includes(title) && html1.includes("Rs. 999") && html1.includes("In stock"));
  const search = await shopHtml(`/books?q=${tag}`);
  r.check("new book appears in shop search", search.includes(`/books/${slug}`));

  // 4. Wrong values are refused and the form keeps what was typed
  const editPath = `/admin/books/${created!.id}/edit`;
  await b.go(editPath);
  await b.fill('[name="stockQuantity"]', "-1");
  await b.fill('[name="price"]', "abc");
  await b.clickText("button", "Save changes");
  await b.waitForText("Please fix the highlighted fields");
  const t4 = await b.text();
  r.check("bad stock and price are explained", t4.includes("Stock must be a whole number") && t4.includes("Price must be a number"));
  r.check("typed values are kept after an error", (await b.js<string>(`document.querySelector('[name="stockQuantity"]').value`)) === "-1" && (await b.js<string>(`document.querySelector('[name="title"]').value`)) === title);
  r.check("nothing was saved", (await bookRow())?.stock_quantity === 5);

  // 5. A fake image is refused
  await b.go(editPath);
  await b.setFile('input[name="cover"]', fakePng);
  await b.clickText("button", "Save changes");
  await b.waitForText("Please fix the highlighted fields");
  r.check("fake image refused", (await b.text()).includes("Cover must be a JPG, PNG or WebP image"));
  r.check("cover unchanged after refused upload", (await bookRow())?.cover_image_path === created!.cover_image_path);

  // 6. Quick edit: stock to 0 -> shop shows Out of stock immediately
  await b.go(`/admin/books?q=${tag}`);
  await b.fill(`#stock-${created!.id}`, "0");
  await b.clickText("button", "Save changes");
  await b.waitForText(/Saved 1 book/);
  r.check("quick edit saved stock 0", (await bookRow())?.stock_quantity === 0);
  // Only the book itself: "You may also like" lists other books with their own "In stock" badges.
  const mainPart = (h: string) => h.split("You may also like")[0];
  const showsOut = (h: string) => mainPart(h).includes("Out of stock") && !mainPart(h).includes(">In stock<");
  const loads: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    loads.push(showsOut(await shopHtml(`/books/${slug}`)));
    await sleep(1500);
  }
  r.info(`shop page after stock=0 save, loads 1-4 show Out of stock: ${loads.join(", ")}`);
  r.check("shop shows Out of stock immediately", loads[0]);

  // 7. A change made elsewhere is not overwritten
  await svc.from("books").update({ price: 998 }).eq("id", created!.id); // e.g. another admin
  await b.fill(`#stock-${created!.id}`, "3");
  await b.clickText("button", "Save changes");
  await b.waitForText("Changed elsewhere");
  const after7 = await bookRow();
  r.check("stale quick edit refused (no overwrite)", after7?.stock_quantity === 0 && after7?.price === 998, JSON.stringify({ s: after7?.stock_quantity, p: after7?.price }));

  // 8. Hide from shop
  await b.go(`/admin/books?q=${tag}`);
  await b.click(`tr:has(#stock-${created!.id}) input[type="checkbox"]`);
  await b.clickText("button", "Save changes");
  await b.waitForText(/Saved 1 book/);
  r.check("book hidden in database", (await bookRow())?.is_active === false);
  r.check("hidden book is gone from the shop", pageTitle(await shopHtml(`/books/${slug}`)).startsWith("Book not found"));
  r.check("hidden book is gone from shop search", !(await shopHtml(`/books?q=${tag}`)).includes(`/books/${slug}`));

  // 9. Categories: add, then delete -> its books move to "Other books"
  await b.go("/admin/categories");
  await b.fill('input[name="name"]', catName);
  await b.clickText("button", "Add");
  await b.waitForText(`Added “${catName}”`);
  const cat = (await svc.from("categories").select("id, slug").eq("name", catName).maybeSingle()).data;
  r.check("category created", Boolean(cat), catName);
  if (cat) {
    await svc.from("books").update({ category_id: cat.id }).eq("id", created!.id);
    await b.go("/admin/categories");
    await b.click(`button[aria-label="Delete ${catName}"]`);
    await b.clickText('[role="dialog"] button', "Delete category");
    await b.waitForText("moved to “Other books”");
    const other = (await svc.from("categories").select("id").eq("slug", "other").single()).data;
    r.check("deleted category's book moved to Other books", (await bookRow())?.category_id === other?.id);
    r.check("category removed", !(await svc.from("categories").select("id").eq("id", cat.id).maybeSingle()).data);
  }

  // 10. Delete the book (type DELETE)
  await b.go(editPath);
  await b.clickText("button", "Delete permanently…");
  await b.waitFor(() => b.js<boolean>(`!!document.querySelector('#confirm-delete')`));
  r.check("delete button stays disabled until DELETE is typed", await b.js<boolean>(`document.querySelector('[role="dialog"] button[type="submit"]').disabled`));
  await b.fill("#confirm-delete", "DELETE");
  await b.click('[role="dialog"] button[type="submit"]');
  await b.waitFor(async () => (await b.url()).startsWith("/admin/books?deleted=1"), 30000);
  r.check("book deleted", !(await bookRow()));
  // Check the bucket itself: the public URL can stay cached on Supabase's CDN for a while.
  const coverName = created!.cover_image_path!.split("/").pop()!;
  const { data: stillThere } = await svc.storage.from("book-covers").list("books", { search: coverName });
  r.check("its cover was removed from storage", (stillThere ?? []).length === 0, JSON.stringify(stillThere));

  r.check("no browser errors", b.logs.length === 0, b.logs.join(" | "));
  b.close();
} catch (e) {
  r.results.push(`ERROR  ${(e as Error).message}`);
} finally {
  const leftover = await bookRow();
  if (leftover) {
    await svc.storage.from("book-covers").remove([leftover.cover_image_path].filter((p): p is string => Boolean(p) && !p!.startsWith("https://")));
    await svc.from("books").delete().eq("id", leftover.id);
  }
  await svc.from("categories").delete().eq("name", catName);
  if (userId) await svc.auth.admin.deleteUser(userId);
  r.check("temporary data cleaned up", !(await bookRow()) && !(await svc.from("categories").select("id").eq("name", catName).maybeSingle()).data);
}

console.log(r.results.join("\n"));
process.exit(r.failed() ? 1 : 0);
