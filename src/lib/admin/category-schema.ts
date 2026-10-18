import { z } from "zod";
import { toSlug } from "@/lib/catalog/lahore-import";

/** The fallback category: books from a deleted category move here. It can't be deleted. */
export const FALLBACK_CATEGORY_SLUG = "other";

const name = z.string().trim().min(1, "Name is required").max(80, "Name is too long (max 80 characters)");
const sortOrder = z
  .string()
  .trim()
  .regex(/^\d{1,4}$/, "Order must be a whole number from 0 to 9999")
  .transform(Number);

export const newCategorySchema = z
  .object({ name, slug: z.string().trim().toLowerCase().max(80), sortOrder })
  .transform((v) => ({ ...v, slug: v.slug || toSlug(v.name).slice(0, 80) }))
  .refine((v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v.slug), {
    path: ["slug"],
    message: "Web address: use lowercase letters, numbers and single dashes",
  });

export const editCategorySchema = z.object({
  id: z.uuid(),
  name,
  sortOrder,
  isActive: z.boolean(),
});
