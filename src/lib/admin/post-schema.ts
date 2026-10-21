import { z } from "zod";
import { allExams } from "@/config/exams";
import { markdownToText } from "@/lib/posts/markdown";
import { safeExternalUrl } from "@/lib/safe-url";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Same rule as the database: https only, no spaces, no login details. */
const APPLY_URL = /^https:\/\/[A-Za-z0-9.-]+(:443)?(\/[^\s]*)?$/;
const examSlugs = new Set(allExams.map((e) => e.slug));

const text = (max: number, label: string) => z.string().trim().max(max, `${label} is too long (max ${max} characters)`);
const optionalText = (max: number, label: string) => text(max, label).transform((v) => v || null);

/** "2026-10-21T14:30" typed in Pakistan time -> ISO timestamp. Pakistan is UTC+5 all year. */
export function pakistanLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const ms = Date.parse(`${local}:00+05:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** ISO timestamp -> "2026-10-21T14:30" in Pakistan time, for <input type="datetime-local">. */
export function isoToPakistanLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(Date.parse(iso) + 5 * 3600_000).toISOString().slice(0, 16);
}

export const postFormSchema = z
  .object({
    kind: z.enum(["blog", "vacancy"], { message: "Choose Blog or Vacancy" }),
    title: text(300, "Title").min(1, "Title is required"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Web address is required")
      .max(200, "Web address is too long")
      .regex(SLUG, "Use only lowercase letters, numbers and single dashes, e.g. ppsc-lecturer-jobs-2026"),
    excerpt: text(500, "Summary"),
    body: z.string().max(50000, "The text is too long (max 50,000 characters)").transform((v) => v.replace(/\r\n?/g, "\n").trim()),
    status: z.enum(["draft", "published", "archived"]),
    publishedAt: z.string().trim(),
    seoTitle: optionalText(120, "Search title"),
    seoDescription: optionalText(300, "Search description"),
    examTag: z
      .string()
      .trim()
      .refine((v) => v === "" || examSlugs.has(v), "Choose an exam from the list")
      .transform((v) => v || null),
    vacancyOrganisation: optionalText(200, "Organisation"),
    vacancyPositions: optionalText(300, "Positions"),
    vacancyLocation: optionalText(120, "Location"),
    vacancyLastDate: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date")
      .transform((v) => v || null),
    applyUrl: z
      .string()
      .trim()
      .max(2000, "Link is too long")
      .refine((v) => v === "" || (APPLY_URL.test(v) && safeExternalUrl(v) !== null), "Use the full official link starting with https://")
      .transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    if (v.publishedAt && !pakistanLocalToIso(v.publishedAt)) {
      ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "Use a valid date and time" });
    }
    if (v.status === "published" && !v.body) {
      ctx.addIssue({ code: "custom", path: ["body"], message: "Write the post before publishing it" });
    }
    if (v.kind === "vacancy" && !v.vacancyOrganisation) {
      ctx.addIssue({ code: "custom", path: ["vacancyOrganisation"], message: "Which organisation is hiring?" });
    }
  });

export type PostFormValues = z.input<typeof postFormSchema>;
export type PostFormData = z.output<typeof postFormSchema>;

export function postFormFromFormData(fd: FormData): PostFormValues {
  const s = (k: string) => String(fd.get(k) ?? "");
  return {
    kind: s("kind") as PostFormValues["kind"],
    title: s("title"),
    slug: s("slug"),
    excerpt: s("excerpt"),
    body: s("body"),
    status: s("status") as PostFormValues["status"],
    publishedAt: s("publishedAt"),
    seoTitle: s("seoTitle"),
    seoDescription: s("seoDescription"),
    examTag: s("examTag"),
    vacancyOrganisation: s("vacancyOrganisation"),
    vacancyPositions: s("vacancyPositions"),
    vacancyLocation: s("vacancyLocation"),
    vacancyLastDate: s("vacancyLastDate"),
    applyUrl: s("applyUrl"),
  };
}

/**
 * Database row for a save. A published post with no date gets the database's
 * own "now" (migration 0007), so a computer clock that runs a little fast can't
 * turn "publish now" into "publish in a few seconds". The summary is made from
 * the text when left empty. Vacancy-only fields are cleared for blog posts.
 */
export function toPostRow(d: PostFormData) {
  const vacancy = d.kind === "vacancy";
  const publishedAt = d.publishedAt ? pakistanLocalToIso(d.publishedAt) : null;
  const autoExcerpt = markdownToText(d.body);
  return {
    kind: d.kind,
    title: d.title,
    slug: d.slug,
    excerpt: d.excerpt || (autoExcerpt.length > 200 ? `${autoExcerpt.slice(0, 197).trimEnd()}…` : autoExcerpt),
    body: d.body,
    status: d.status,
    published_at: publishedAt,
    seo_title: d.seoTitle,
    seo_description: d.seoDescription,
    exam_tag: d.examTag,
    vacancy_organisation: vacancy ? d.vacancyOrganisation : null,
    vacancy_positions: vacancy ? d.vacancyPositions : null,
    vacancy_location: vacancy ? d.vacancyLocation : null,
    vacancy_last_date: vacancy ? d.vacancyLastDate : null,
    apply_url: vacancy ? d.applyUrl : null,
  };
}
