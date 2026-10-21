import { describe, expect, it } from "vitest";
import { bannerSlideSchema, isSafeSlideLink, toBannerRow, type BannerSlideValues } from "./banner-schema";

const valid: BannerSlideValues = {
  eyebrow: "New",
  title: "FIA Test Preparation",
  body: "Starts here.",
  examTag: "jobs",
  buttonLabel: "Buy now",
  buttonHref: "/books?exam=jobs",
  secondaryLabel: "",
  secondaryHref: "",
  isActive: true,
  sortOrder: "10",
};
const errors = (patch: Partial<BannerSlideValues>) => {
  const r = bannerSlideSchema.safeParse({ ...valid, ...patch });
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("banner slide form", () => {
  it("accepts a valid slide", () => {
    expect(toBannerRow(bannerSlideSchema.parse(valid))).toMatchObject({ title: "FIA Test Preparation", exam_tag: "jobs", sort_order: 10, secondary_label: null });
  });

  it("only allows site pages or https links", () => {
    expect(isSafeSlideLink("/books?exam=css-pms")).toBe(true);
    expect(isSafeSlideLink("https://www.fia.gov.pk/jobs")).toBe(true);
    for (const bad of ["javascript:alert(1)", "http://x.com", "//evil.com", "books", "/a b"]) expect(isSafeSlideLink(bad)).toBe(false);
    expect(errors({ buttonHref: "javascript:alert(1)" })).toContain("buttonHref");
  });

  it("needs a title and button, and both parts of a second button", () => {
    expect(errors({ title: "" })).toContain("title");
    expect(errors({ buttonLabel: "" })).toContain("buttonLabel");
    expect(errors({ secondaryLabel: "More" })).toContain("secondaryHref");
    expect(errors({ secondaryLabel: "More", secondaryHref: "/blog" })).toEqual([]);
    expect(errors({ examTag: "made-up" })).toContain("examTag");
  });
});
