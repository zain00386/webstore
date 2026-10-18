import { describe, expect, it } from "vitest";
import { formatDate, safeExternalUrl } from "./safe-url";

describe("safeExternalUrl", () => {
  it("allows normal https links", () => {
    expect(safeExternalUrl("https://www.ppsc.gop.pk/jobs")).toBe("https://www.ppsc.gop.pk/jobs");
  });

  it("blocks dangerous or unusual links", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,hi")).toBeNull();
    expect(safeExternalUrl("http://example.com")).toBeNull();
    expect(safeExternalUrl("https://user:pass@example.com")).toBeNull();
    expect(safeExternalUrl("https://example.com:8080")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats ISO dates", () => {
    expect(formatDate("2026-11-05")).toBe("5 Nov 2026");
  });
});
