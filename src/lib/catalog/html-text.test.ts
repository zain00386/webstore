import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToTextBlocks } from "./html-text";
import { deriveExams } from "./exams";

describe("htmlToTextBlocks", () => {
  it("turns paragraphs and list items into plain text blocks", () => {
    const html = `<p class="x"><strong>Guide</strong> for &amp; students</p><ul><li>MCQs</li><li>Past&nbsp;papers</li></ul>`;
    expect(htmlToTextBlocks(html)).toEqual(["Guide for & students", "• MCQs", "• Past papers"]);
  });

  it("drops scripts and any remaining tags", () => {
    expect(htmlToTextBlocks(`<script>alert(1)</script><p>Safe <img src=x onerror=alert(1)>text</p>`)).toEqual([
      "Safe text",
    ]);
  });

  it("splits run-together tick lists into items", () => {
    expect(htmlToTextBlocks("<p>✓ Up-to-date Guide✓ MCQs Based✔ Past Papers</p>")).toEqual([
      "• Up-to-date Guide",
      "• MCQs Based",
      "• Past Papers",
    ]);
  });

  it("handles empty input", () => {
    expect(htmlToTextBlocks(null)).toEqual([]);
    expect(htmlToTextBlocks("")).toEqual([]);
  });

  it("decodes numeric entities", () => {
    expect(decodeEntities("Part &#8211; I &#x2019;s")).toBe("Part – I ’s");
  });
});

describe("deriveExams", () => {
  it("tags by category and by title keywords", () => {
    expect(deriveExams("PPSC Combined Competitive Examination PMS Guide", "css-pms")).toEqual(
      expect.arrayContaining(["css-pms", "fpsc-ppsc"]),
    );
    expect(deriveExams("ISSB Tests Preparation Guide", "armed-forces")).toEqual(["armed-forces", "issb"]);
    expect(deriveExams("Punjab Police Sub-Inspector Guide", "job-tests")).toEqual(expect.arrayContaining(["jobs", "police"]));
    expect(deriveExams("Kids Coloring Book", "children")).toEqual([]);
  });
});
