import { describe, expect, it } from "vitest";
import { friendlyBookError } from "./db-errors";
import { checkCoverFile, detectImageType, MAX_COVER_BYTES } from "./image-type";
import { isValidIsbn, normalizeIsbn } from "./isbn";

describe("ISBN", () => {
  it("normalises dashes and spaces", () => {
    expect(normalizeIsbn("978-0-306 40615-7")).toBe("9780306406157");
    expect(normalizeIsbn("0-8044-2957-x")).toBe("080442957X");
  });
  it("checks the check digit", () => {
    expect(isValidIsbn("9780306406157")).toBe(true);
    expect(isValidIsbn("9780306406158")).toBe(false); // typo in last digit
    expect(isValidIsbn("080442957X")).toBe(true);
    expect(isValidIsbn("0804429579")).toBe(false);
    expect(isValidIsbn("12345")).toBe(false);
  });
});

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("detectImageType", () => {
  it("recognises JPEG, PNG and WebP by their bytes", () => {
    expect(detectImageType(jpg)?.ext).toBe("jpg");
    expect(detectImageType(png)?.ext).toBe("png");
    expect(detectImageType(webp)?.ext).toBe("webp");
  });
  it("rejects other files even if renamed", () => {
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // PDF
  });
});

describe("checkCoverFile", () => {
  it("accepts a small real image", async () => {
    const r = await checkCoverFile(new File([png], "cover.png", { type: "image/png" }));
    expect(r.ok).toBe(true);
  });
  it("rejects a fake image and a file over 2 MB", async () => {
    const fake = await checkCoverFile(new File(["<html>"], "cover.jpg", { type: "image/jpeg" }));
    expect(fake).toEqual({ ok: false, error: "Cover must be a JPG, PNG or WebP image." });
    const big = new Uint8Array(MAX_COVER_BYTES + 1);
    big.set(jpg);
    expect((await checkCoverFile(new File([big], "big.jpg"))).ok).toBe(false);
  });
});

describe("friendlyBookError", () => {
  it("explains duplicate addresses and price rules", () => {
    expect(friendlyBookError({ code: "23505", message: 'duplicate key value violates unique constraint "books_slug_key"' })).toMatchObject({
      field: "slug",
    });
    expect(friendlyBookError({ code: "23514", message: 'violates check constraint "books_check"', details: "compare_at_price" })).toMatchObject({
      field: "compareAtPrice",
    });
    expect(friendlyBookError({ code: "42501", message: "new row violates row-level security policy" }).message).toMatch(/permission/);
    expect(friendlyBookError({ message: "boom" }).message).toBe("Could not save. Please try again.");
  });
});
