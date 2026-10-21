import { z } from "zod";
import { allExams } from "@/config/exams";
import { safeExternalUrl } from "@/lib/safe-url";

const examSlugs = new Set(allExams.map((e) => e.slug));
/** Same rule as the database: a page of this site, or an https:// link. */
const INTERNAL = /^\/[A-Za-z0-9/_?=&.%-]*$/;

export function isSafeSlideLink(v: string): boolean {
  if (v.startsWith("//")) return false;
  if (INTERNAL.test(v)) return true;
  return /^https:\/\/[A-Za-z0-9.-]+(\/\S*)?$/.test(v) && safeExternalUrl(v) !== null;
}

const link = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} is too long`)
    .refine((v) => v === "" || isSafeSlideLink(v), `${label}: use a page of this site like /books?exam=css-pms, or a full https:// address`);

export const bannerSlideSchema = z
  .object({
    eyebrow: z.string().trim().max(40, "At most 40 characters"),
    title: z.string().trim().min(1, "Title is required").max(120, "At most 120 characters"),
    body: z.string().trim().max(300, "At most 300 characters"),
    examTag: z
      .string()
      .trim()
      .refine((v) => v === "" || examSlugs.has(v), "Choose an exam from the list")
      .transform((v) => v || null),
    buttonLabel: z.string().trim().min(1, "Button text is required").max(30, "At most 30 characters"),
    buttonHref: link("Button link").refine((v) => v !== "", "Button link is required"),
    secondaryLabel: z.string().trim().max(30, "At most 30 characters"),
    secondaryHref: link("Second button link"),
    isActive: z.boolean(),
    sortOrder: z
      .string()
      .trim()
      .regex(/^\d{1,5}$/, "A whole number, e.g. 10")
      .transform(Number)
      .refine((n) => n <= 10000, "At most 10000"),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.secondaryLabel) !== Boolean(v.secondaryHref)) {
      ctx.addIssue({ code: "custom", path: [v.secondaryLabel ? "secondaryHref" : "secondaryLabel"], message: "Fill in both the second button's text and link, or leave both empty" });
    }
  });

export type BannerSlideValues = z.input<typeof bannerSlideSchema>;

export function bannerSlideFromFormData(fd: FormData): BannerSlideValues {
  const s = (k: string) => String(fd.get(k) ?? "");
  return {
    eyebrow: s("eyebrow"),
    title: s("title"),
    body: s("body"),
    examTag: s("examTag"),
    buttonLabel: s("buttonLabel"),
    buttonHref: s("buttonHref"),
    secondaryLabel: s("secondaryLabel"),
    secondaryHref: s("secondaryHref"),
    isActive: fd.get("isActive") === "on",
    sortOrder: s("sortOrder") || "100",
  };
}

export function toBannerRow(v: z.output<typeof bannerSlideSchema>) {
  return {
    eyebrow: v.eyebrow,
    title: v.title,
    body: v.body,
    exam_tag: v.examTag,
    button_label: v.buttonLabel,
    button_href: v.buttonHref,
    secondary_label: v.secondaryLabel || null,
    secondary_href: v.secondaryHref || null,
    is_active: v.isActive,
    sort_order: v.sortOrder,
  };
}
