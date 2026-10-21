import { describe, expect, it } from "vitest";
import { isoToPakistanLocal, pakistanLocalToIso, postFormSchema, toPostRow, type PostFormValues } from "./post-schema";

const valid: PostFormValues = {
  kind: "vacancy",
  title: "PPSC Lecturer jobs 2026",
  slug: "ppsc-lecturer-jobs-2026",
  excerpt: "",
  body: "## Eligibility\n- Masters degree",
  status: "published",
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
  examTag: "fpsc-ppsc",
  vacancyOrganisation: "Punjab Public Service Commission",
  vacancyPositions: "Lecturers",
  vacancyLocation: "Punjab",
  vacancyLastDate: "2026-11-05",
  applyUrl: "https://www.ppsc.gop.pk/jobs",
};

const errors = (patch: Partial<PostFormValues>) => {
  const r = postFormSchema.safeParse({ ...valid, ...patch });
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("post form", () => {
  it("accepts a valid vacancy; with no date the database sets 'now'", () => {
    const row = toPostRow(postFormSchema.parse(valid));
    expect(row.published_at).toBeNull();
    expect(toPostRow(postFormSchema.parse({ ...valid, publishedAt: "2026-10-21T14:30" })).published_at).toBe("2026-10-21T09:30:00.000Z");
    expect(row.excerpt).toBe("Eligibility Masters degree"); // made from the text
    expect(row.apply_url).toBe("https://www.ppsc.gop.pk/jobs");
  });

  it("converts Pakistan time both ways", () => {
    expect(pakistanLocalToIso("2026-10-21T14:30")).toBe("2026-10-21T09:30:00.000Z");
    expect(isoToPakistanLocal("2026-10-21T09:30:00.000Z")).toBe("2026-10-21T14:30");
    expect(pakistanLocalToIso("21/10/2026")).toBeNull();
  });

  it("only allows safe official links", () => {
    for (const bad of ["http://ppsc.gop.pk", "javascript:alert(1)", "https://user:pw@ppsc.gop.pk", "https://ppsc.gop.pk/a b"]) {
      expect(errors({ applyUrl: bad })).toContain("applyUrl");
    }
  });

  it("checks slug, exam, vacancy organisation and empty published posts", () => {
    expect(errors({ slug: "Bad Slug!" })).toContain("slug");
    expect(errors({ examTag: "not-an-exam" })).toContain("examTag");
    expect(errors({ vacancyOrganisation: "" })).toContain("vacancyOrganisation");
    expect(errors({ body: "" })).toContain("body");
    expect(errors({ body: "", status: "draft" })).toEqual([]);
  });

  it("clears vacancy-only fields for blog posts", () => {
    const row = toPostRow(postFormSchema.parse({ ...valid, kind: "blog" }));
    expect(row.vacancy_organisation).toBeNull();
    expect(row.apply_url).toBeNull();
  });

  it("keeps drafts unpublished", () => {
    expect(toPostRow(postFormSchema.parse({ ...valid, status: "draft" })).published_at).toBeNull();
  });
});
