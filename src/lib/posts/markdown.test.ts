import { describe, expect, it } from "vitest";
import { markdownToText, parseInline, parseMarkdown, safeHref } from "./markdown";

describe("post markdown", () => {
  it("turns headings, paragraphs and lists into blocks", () => {
    const blocks = parseMarkdown("Intro line one\nline two\n\n## Eligibility\n- Masters degree\n- Age 21-35\n\n### Steps\n1. Apply online\n2. Pay fee");
    expect(blocks.map((b) => b.type)).toEqual(["p", "h2", "ul", "h3", "ol"]);
    expect(blocks[0]).toEqual({ type: "p", content: [{ type: "text", text: "Intro line one line two" }] });
    expect(blocks[2]).toMatchObject({ items: [[{ text: "Masters degree" }], [{ text: "Age 21-35" }]] });
  });

  it("supports bold and safe links", () => {
    expect(parseInline("Read **carefully** and [apply here](https://www.ppsc.gop.pk/jobs) or [see books](/books?exam=fpsc-ppsc).")).toEqual([
      { type: "text", text: "Read " },
      { type: "text", text: "carefully", bold: true },
      { type: "text", text: " and " },
      { type: "link", text: "apply here", href: "https://www.ppsc.gop.pk/jobs", external: true },
      { type: "text", text: " or " },
      { type: "link", text: "see books", href: "/books?exam=fpsc-ppsc", external: false },
      { type: "text", text: "." },
    ]);
  });

  it("never makes unsafe links", () => {
    for (const bad of ["javascript:alert(1)", "http://example.com", "//evil.com", "data:text/html,x", "https://user:pw@x.com"]) {
      expect(safeHref(bad)).toBeNull();
    }
    expect(parseInline("[click](javascript:alert(1))")[0]).toEqual({ type: "text", text: "click" });
  });

  it("keeps HTML as plain text", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>\n<img src=x onerror=alert(1)>");
    expect(blocks).toEqual([{ type: "p", content: [{ type: "text", text: "<script>alert(1)</script> <img src=x onerror=alert(1)>" }] }]);
  });

  it("makes plain text for summaries", () => {
    expect(markdownToText("## Title\nSome **bold** [link](https://a.pk)\n- one")).toBe("Title Some bold link one");
  });
});
