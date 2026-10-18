/**
 * npm run db:import            import new books (starting stock 10 each)
 * npm run db:import -- --dry-run          show what would happen, change nothing
 * npm run db:import -- --stock=5          different starting stock for NEW books
 * npm run db:import -- --update           also refresh titles/prices/descriptions of
 *                                         previously imported books (stock is never touched)
 *
 * Copies books from data/import/lahore-products.json into Supabase and copies
 * each cover image into the "book-covers" storage bucket. Safe to run again:
 * books already imported are skipped, so admin edits to stock are never overwritten.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { mapLahoreProduct, type ImportedBook, type LahoreProduct } from "../src/lib/catalog/lahore-import";
import type { Database } from "../src/lib/supabase/database.types";
import { categories } from "../src/config/categories";
import { descriptionText, imageExtension, mapWithConcurrency, MAX_IMAGE_BYTES, parseImportArgs } from "./lib/import-helpers";
import { loadScriptEnv } from "./lib/script-env";

const options = parseImportArgs(process.argv.slice(2));
const env = loadScriptEnv();
const db = createClient<Database>(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function categorySlugFor(sourceCategories: string[]): string {
  for (const name of sourceCategories) {
    const match = categories.find((c) => c.sourceNames.includes(name));
    if (match) return match.slug;
  }
  return "other";
}

const products = JSON.parse(readFileSync("data/import/lahore-products.json", "utf8").replace(/^﻿/, "")) as LahoreProduct[];
const sellable = products.map((p) => mapLahoreProduct(p, categorySlugFor)).filter((b): b is ImportedBook => b !== null);
const skippedNoPrice = products.length - sellable.length;
const books = options.limit ? sellable.slice(0, options.limit) : sellable;

const { data: categoryRows, error: catError } = await db.from("categories").select("id, slug");
if (catError) throw new Error(`Could not read categories (have you run the migrations?): ${catError.message}`);
const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));

const { data: existingRows, error: existError } = await db.from("books").select("slug, source_ref");
if (existError) throw new Error(`Could not read books: ${existError.message}`);
const importedRefs = new Set(existingRows.map((b) => b.source_ref).filter(Boolean));
const takenSlugs = new Map(existingRows.map((b) => [b.slug, b.source_ref]));

const toCreate = books.filter((b) => !importedRefs.has(b.sourceRef));
const toUpdate = options.update ? books.filter((b) => importedRefs.has(b.sourceRef)) : [];

console.log(
  `\n${sellable.length} sellable books in the snapshot (${skippedNoPrice} skipped: no price)${options.limit ? `; processing the first ${books.length}` : ""}.`,
);
console.log(`${toCreate.length} new to import, ${books.length - toCreate.length} already imported${options.update ? ` (${toUpdate.length} will be refreshed)` : ""}.`);
if (options.dryRun) {
  console.log("\nDry run: nothing was changed.");
  for (const b of toCreate.slice(0, 10)) console.log(`  + ${b.title} — Rs. ${b.price}`);
  if (toCreate.length > 10) console.log(`  … and ${toCreate.length - 10} more`);
  process.exit(0);
}

/** Downloads a Lahore image and stores our own copy. Falls back to the original link if that fails. */
async function copyImage(url: string, baseName: string): Promise<{ path: string; note?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return { path: url, note: `image download failed (${res.status}), linked instead` };
    const ext = imageExtension(res.headers.get("content-type"));
    if (!ext) return { path: url, note: "unsupported image type, linked instead" };
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) return { path: url, note: "image over 2 MB, linked instead" };
    const path = `lahore/${baseName}.${ext}`;
    const { error } = await db.storage.from("book-covers").upload(path, bytes, {
      contentType: res.headers.get("content-type") ?? undefined,
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) return { path: url, note: `upload failed (${error.message}), linked instead` };
    return { path };
  } catch (e) {
    return { path: url, note: `image error (${(e as Error).message}), linked instead` };
  }
}

async function copyImages(book: ImportedBook, slug: string): Promise<{ cover: string | null; gallery: string[]; notes: string[] }> {
  const notes: string[] = [];
  if (!book.imageUrl) return { cover: null, gallery: [], notes: ["no image"] };
  const cover = await copyImage(book.imageUrl, slug);
  if (cover.note) notes.push(`cover: ${cover.note}`);
  const gallery: string[] = [];
  for (const [i, url] of book.galleryUrls.entries()) {
    const img = await copyImage(url, `${slug}-${i + 2}`);
    if (img.note) notes.push(`photo ${i + 2}: ${img.note}`);
    gallery.push(img.path);
  }
  return { cover: cover.path, gallery, notes };
}

let created = 0;
let failed = 0;
const notes: string[] = [];

await mapWithConcurrency(toCreate, 4, async (book, i) => {
  let slug = book.slug;
  if (takenSlugs.has(slug) && takenSlugs.get(slug) !== book.sourceRef) slug = `${slug}-${book.sourceId}`;
  const images = await copyImages(book, slug);
  for (const note of images.notes) notes.push(`${book.title}: ${note}`);
  const { error } = await db.from("books").insert({
    source_ref: book.sourceRef,
    slug,
    title: book.title,
    subtitle: book.subtitle,
    publisher: book.publisher,
    description: descriptionText(book.descriptionBlocks),
    category_id: categoryId.get(book.categorySlug) ?? categoryId.get("other") ?? null,
    exam_tags: book.examTags,
    price: book.price,
    compare_at_price: book.compareAtPrice,
    stock_quantity: options.stock,
    cover_image_path: images.cover,
    gallery_paths: images.gallery,
    is_active: true,
    is_new_arrival: book.isNewArrival,
  });
  if (error) {
    failed++;
    notes.push(`${book.title}: NOT imported (${error.message})`);
  } else {
    created++;
  }
  if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${toCreate.length}`);
});

let updated = 0;
for (const book of toUpdate) {
  const { error } = await db
    .from("books")
    .update({
      title: book.title,
      subtitle: book.subtitle,
      description: descriptionText(book.descriptionBlocks),
      price: book.price,
      compare_at_price: book.compareAtPrice,
      exam_tags: book.examTags,
    })
    .eq("source_ref", book.sourceRef);
  if (error) notes.push(`${book.title}: update failed (${error.message})`);
  else updated++;
}

console.log(`\nDone: ${created} imported, ${updated} refreshed, ${failed} failed.`);
if (notes.length) {
  console.log(`\nNotes (${notes.length}):`);
  for (const n of notes.slice(0, 30)) console.log(`  - ${n}`);
  if (notes.length > 30) console.log(`  … and ${notes.length - 30} more`);
}
process.exit(failed ? 1 : 0);
