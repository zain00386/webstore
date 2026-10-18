import { z } from "zod";
import { allExams } from "@/config/exams";
import { isValidIsbn, normalizeIsbn } from "./isbn";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MONEY = /^\d{1,7}(\.\d{1,2})?$/;
const examSlugs = allExams.map((e) => e.slug) as [string, ...string[]];

const text = (max: number, label: string) => z.string().trim().max(max, `${label} is too long (max ${max} characters)`);
const optionalText = (max: number, label: string) => text(max, label).transform((v) => v || null);

const money = (label: string) =>
  z
    .string()
    .trim()
    .regex(MONEY, `${label} must be a number like 1250 or 1250.50`)
    .transform(Number);

const optionalMoney = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || MONEY.test(v), `${label} must be a number like 1250, or left empty`)
    .transform((v) => (v === "" ? null : Number(v)));

const wholeNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number (0 or more)`)
    .transform(Number)
    .refine((n) => n <= max, `${label} can be at most ${max}`);

/** Validates the Add/Edit book form. The same rules run on the server for every save. */
export const bookFormSchema = z
  .object({
    title: text(300, "Title").min(1, "Title is required"),
    subtitle: optionalText(500, "Subtitle"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Web address is required")
      .max(200, "Web address is too long")
      .regex(SLUG, "Use only lowercase letters, numbers and single dashes, e.g. css-english-essay"),
    author: optionalText(200, "Author"),
    publisher: optionalText(120, "Publisher"),
    edition: optionalText(80, "Edition"),
    isbn: z
      .string()
      .transform(normalizeIsbn)
      .refine((v) => v === "" || isValidIsbn(v), "This ISBN doesn't look right. Check the 10 or 13 digits.")
      .transform((v) => v || null),
    description: z
      .string()
      .max(20000, "Description is too long (max 20,000 characters)")
      .transform((v) =>
        v
          .replace(/\r\n?/g, "\n")
          .split("\n")
          .map((l) => l.trimEnd())
          .join("\n")
          .trim(),
      ),
    categoryId: z.union([z.uuid("Choose a category"), z.literal("")]).transform((v) => v || null),
    examTags: z.array(z.enum(examSlugs, { message: "Unknown exam" })).max(20, "Choose at most 20 exams"),
    language: z.enum(["", "English", "Urdu", "Bilingual"]).transform((v) => v || null),
    price: money("Price"),
    compareAtPrice: optionalMoney("'Was' price"),
    stockQuantity: wholeNumber("Stock", 100_000),
    lowStockThreshold: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d+$/.test(v), "Low-stock alert must be a whole number, or left empty")
      .transform((v) => (v === "" ? null : Number(v))),
    isActive: z.boolean(),
    isNewArrival: z.boolean(),
  })
  .refine((v) => v.compareAtPrice === null || v.compareAtPrice > v.price, {
    path: ["compareAtPrice"],
    message: "The 'was' price must be higher than the price (or left empty).",
  });

export type BookFormValues = z.input<typeof bookFormSchema>;
export type BookFormData = z.output<typeof bookFormSchema>;

/** Reads the form fields (checkbox = present/absent, exam tags = several values). */
export function bookFormFromFormData(fd: FormData): BookFormValues {
  const s = (k: string) => String(fd.get(k) ?? "");
  return {
    title: s("title"),
    subtitle: s("subtitle"),
    slug: s("slug"),
    author: s("author"),
    publisher: s("publisher"),
    edition: s("edition"),
    isbn: s("isbn"),
    description: s("description"),
    categoryId: s("categoryId"),
    examTags: fd.getAll("examTags").map(String),
    language: s("language") as BookFormValues["language"],
    price: s("price"),
    compareAtPrice: s("compareAtPrice"),
    stockQuantity: s("stockQuantity"),
    lowStockThreshold: s("lowStockThreshold"),
    isActive: fd.get("isActive") === "on",
    isNewArrival: fd.get("isNewArrival") === "on",
  };
}

/** Database column names for a validated form. */
export function toBookRow(d: BookFormData) {
  return {
    title: d.title,
    subtitle: d.subtitle,
    slug: d.slug,
    author: d.author,
    publisher: d.publisher,
    edition: d.edition,
    isbn: d.isbn,
    description: d.description,
    category_id: d.categoryId,
    exam_tags: [...new Set(d.examTags)],
    language: d.language,
    price: d.price,
    compare_at_price: d.compareAtPrice,
    stock_quantity: d.stockQuantity,
    low_stock_threshold: d.lowStockThreshold,
    is_active: d.isActive,
    is_new_arrival: d.isNewArrival,
  };
}

/** Quick-edit table: price, stock and shop visibility for many books at once. */
export const quickEditSchema = z
  .array(
    z.object({
      id: z.uuid(),
      updatedAt: z.string().min(10).max(40),
      // At most 2 decimals, checked without floating-point surprises (19.99 * 100 = 1998.9999…).
      price: z
        .number()
        .min(0)
        .max(9_999_999.99)
        .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Price can have at most 2 decimals"),
      stockQuantity: z.number().int().min(0).max(100_000),
      isActive: z.boolean(),
    }),
  )
  .min(1)
  .max(200);

export type QuickEditChange = z.infer<typeof quickEditSchema>[number];
