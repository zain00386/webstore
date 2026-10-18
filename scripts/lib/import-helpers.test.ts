import { describe, expect, it } from "vitest";
import { descriptionText, imageExtension, mapWithConcurrency, parseImportArgs } from "./import-helpers";

describe("parseImportArgs", () => {
  it("has safe defaults", () => {
    expect(parseImportArgs([])).toEqual({ stock: 10, dryRun: false, limit: null, update: false });
  });

  it("reads options", () => {
    expect(parseImportArgs(["--stock=5", "--dry-run", "--limit=20", "--update"])).toEqual({
      stock: 5,
      dryRun: true,
      limit: 20,
      update: true,
    });
  });

  it("rejects bad values", () => {
    expect(() => parseImportArgs(["--stock=-1"])).toThrow();
    expect(() => parseImportArgs(["--stock=abc"])).toThrow();
    expect(() => parseImportArgs(["--limit=0"])).toThrow();
    expect(() => parseImportArgs(["--delete-everything"])).toThrow(/Unknown option/);
  });
});

describe("imageExtension", () => {
  it("allows only jpeg, png and webp", () => {
    expect(imageExtension("image/jpeg")).toBe("jpg");
    expect(imageExtension("image/png; charset=binary")).toBe("png");
    expect(imageExtension("image/svg+xml")).toBeNull();
    expect(imageExtension("text/html")).toBeNull();
    expect(imageExtension(null)).toBeNull();
  });
});

describe("mapWithConcurrency", () => {
  it("keeps order and limits parallel work", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });
});

describe("descriptionText", () => {
  it("joins blocks with new lines", () => {
    expect(descriptionText(["a", "• b"])).toBe("a\n• b");
  });
});
