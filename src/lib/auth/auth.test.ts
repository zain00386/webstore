import { describe, expect, it } from "vitest";
import { loginSchema } from "./login-schema";
import { createRateLimiter } from "./rate-limit";
import { isSameOrigin } from "./same-origin";
import { safeAdminNext } from "./safe-next";

describe("safeAdminNext", () => {
  it("allows admin paths", () => {
    expect(safeAdminNext("/admin/books")).toBe("/admin/books");
    expect(safeAdminNext("/admin/orders?status=pending")).toBe("/admin/orders?status=pending");
    expect(safeAdminNext("%2Fadmin%2Fposts")).toBe("/admin/posts");
  });

  it("blocks anything that could leave the admin area or the site", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/admin.evil.com",
      "/administrator",
      "/books",
      "javascript:alert(1)",
      "/admin\r\nSet-Cookie: x",
      "%E0%A4%A",
      "/admin/login",
      null,
      "",
    ]) {
      expect(safeAdminNext(bad), String(bad)).toBe("/admin");
    }
  });
});

describe("isSameOrigin", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost:3000/admin/login/submit", { method: "POST", headers });
  it("accepts requests from our own pages", () => {
    expect(isSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(isSameOrigin(req({ origin: "https://shop.pk", host: "internal:3000", "x-forwarded-host": "shop.pk" }))).toBe(true);
  });
  it("rejects other websites and requests with no origin", () => {
    expect(isSameOrigin(req({ origin: "https://evil.example.com", host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "null", host: "localhost:3000" }))).toBe(false);
  });
});

describe("login rate limiter", () => {
  it("blocks after the limit and frees up after the window", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    for (let i = 0; i < 3; i++) {
      expect(limiter.check("k", i).allowed).toBe(true);
      limiter.fail("k", i);
    }
    const blocked = limiter.check("k", 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(990);
    expect(limiter.check("k", 1001).allowed).toBe(true);
  });

  it("keeps keys separate and resets on success", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.fail("a", 0);
    expect(limiter.check("a", 1).allowed).toBe(false);
    expect(limiter.check("b", 1).allowed).toBe(true);
    limiter.reset("a");
    expect(limiter.check("a", 2).allowed).toBe(true);
  });
});

describe("loginSchema", () => {
  it("normalises email and requires a password", () => {
    expect(loginSchema.parse({ email: "  Owner@Example.COM ", password: "x" }).email).toBe("owner@example.com");
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
