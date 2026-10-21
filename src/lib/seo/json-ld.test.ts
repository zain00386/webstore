import { describe, expect, it } from "vitest";
import { jsonLdHtml } from "./json-ld";

describe("JSON-LD script contents", () => {
  it("escapes every < so text can never close or open a script tag", () => {
    const html = jsonLdHtml({ description: "</script><script>alert(1)</script>" }).__html;
    expect(html).not.toContain("<");
    expect(html).toContain("\\" + "u003c/script>");
    expect(JSON.parse(html)).toEqual({ description: "</script><script>alert(1)</script>" });
  });
});
