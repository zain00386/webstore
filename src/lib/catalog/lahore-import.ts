import { deriveExams } from "./exams";
import { decodeEntities, htmlToTextBlocks } from "./html-text";

/** One product from data/import/lahore-products.json (Lahore WooCommerce snapshot). */
export type LahoreProduct = {
  sourceId: number;
  name: string;
  slug: string;
  price: number;
  regularPrice: number;
  categories: string[];
  shortDescription: string | null;
  description: string | null;
  images: string[];
};

/** A book ready to store, independent of where it is stored. */
export type ImportedBook = {
  sourceRef: string;
  sourceId: number;
  slug: string;
  title: string;
  subtitle: string | null;
  publisher: string;
  descriptionBlocks: string[];
  categorySlug: string;
  examTags: string[];
  price: number;
  compareAtPrice: number | null;
  isNewArrival: boolean;
  imageUrl: string | null;
};

/** "... by Dogar Publishers", "... by Dogar & Medicare Books" etc. The publisher is shown separately. */
const PUBLISHER_SUFFIX = /\s+by\s+[^|]*\bDogar\b[^|]*$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200)
    .replace(/-$/, "");
}

/** Maps a Lahore product to our book shape, or null if it can't be sold (e.g. price 0). */
export function mapLahoreProduct(
  p: LahoreProduct,
  categorySlugFor: (sourceCategories: string[]) => string,
): ImportedBook | null {
  if (!p.price || p.price <= 0) return null;
  const name = decodeEntities(p.name).trim();
  const [mainTitle, ...rest] = (name.replace(PUBLISHER_SUFFIX, "").trim() || name).split(/\s+\|\s+/);
  const title = mainTitle.trim().slice(0, 300);
  const categorySlug = categorySlugFor(p.categories);
  const short = htmlToTextBlocks(p.shortDescription);
  const long = htmlToTextBlocks(p.description);
  const slug = SLUG.test(p.slug) && p.slug.length <= 200 ? p.slug : toSlug(p.slug || title);
  const imageUrl = p.images.find((u) => u.startsWith("https://")) ?? null;
  return {
    sourceRef: `lahore:${p.sourceId}`,
    sourceId: p.sourceId,
    slug,
    title,
    subtitle: rest.join(" · ").trim().slice(0, 500) || null,
    publisher: "Dogar Publishers",
    descriptionBlocks: short.length >= long.length ? short : long,
    categorySlug,
    examTags: deriveExams(name, categorySlug),
    price: p.price,
    compareAtPrice: p.regularPrice > p.price ? p.regularPrice : null,
    isNewArrival: p.categories.some((c) => c.startsWith("New Arrivals")),
    imageUrl,
  };
}
