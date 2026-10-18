import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { attemptAdminSignIn, type SignInDeps } from "./sign-in";

const ADMIN = { email: "owner@example.com", password: "right-password" };

function fakeSupabase(accounts: Record<string, { password: string; admin: boolean }>) {
  let signedIn: string | null = null;
  const deps: SignInDeps & { signedIn: () => string | null } = {
    clientKey: "1.2.3.4",
    signInWithPassword: vi.fn(async (email: string, password: string) => {
      const ok = accounts[email]?.password === password;
      if (ok) signedIn = email;
      return { ok };
    }),
    isAdmin: vi.fn(async () => Boolean(signedIn && accounts[signedIn]?.admin)),
    signOut: vi.fn(async () => {
      signedIn = null;
    }),
    signedIn: () => signedIn,
  };
  return deps;
}

const accounts = {
  [ADMIN.email]: { password: ADMIN.password, admin: true },
  "staff@example.com": { password: "staff-pass", admin: false },
};

const newLimiter = () => createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });

describe("attemptAdminSignIn", () => {
  it("signs in an admin and redirects to a safe admin page", async () => {
    const deps = fakeSupabase(accounts);
    const r = await attemptAdminSignIn({ ...ADMIN, next: "/admin/books" }, newLimiter(), deps);
    expect(r).toEqual({ ok: true, redirectTo: "/admin/books" });
    expect(deps.signedIn()).toBe(ADMIN.email);
  });

  it("ignores an external 'next' address", async () => {
    const r = await attemptAdminSignIn({ ...ADMIN, next: "https://evil.example.com" }, newLimiter(), fakeSupabase(accounts));
    expect(r).toEqual({ ok: true, redirectTo: "/admin" });
  });

  it("gives the same message for a wrong password and an unknown email", async () => {
    const limiter = newLimiter();
    const wrong = await attemptAdminSignIn({ email: ADMIN.email, password: "nope", next: "" }, limiter, fakeSupabase(accounts));
    const unknown = await attemptAdminSignIn({ email: "who@example.com", password: "x", next: "" }, limiter, fakeSupabase(accounts));
    expect(wrong).toMatchObject({ ok: false, error: "Incorrect email or password." });
    expect(unknown).toMatchObject({ ok: false, error: "Incorrect email or password." });
  });

  it("refuses a non-admin AND signs them back out", async () => {
    const deps = fakeSupabase(accounts);
    const r = await attemptAdminSignIn({ email: "staff@example.com", password: "staff-pass", next: "" }, newLimiter(), deps);
    expect(r).toMatchObject({ ok: false, error: "This account doesn't have admin access." });
    expect(deps.signOut).toHaveBeenCalledOnce();
    expect(deps.signedIn()).toBeNull();
  });

  it("blocks after 5 failures, even with the right password, without calling Supabase", async () => {
    const limiter = newLimiter();
    const deps = fakeSupabase(accounts);
    for (let i = 0; i < 5; i++) {
      const r = await attemptAdminSignIn({ email: ADMIN.email, password: `bad-${i}`, next: "" }, limiter, deps);
      expect(r).toMatchObject({ error: "Incorrect email or password." });
    }
    const blocked = await attemptAdminSignIn({ ...ADMIN, next: "" }, limiter, deps);
    expect(blocked).toMatchObject({ ok: false, error: expect.stringContaining("Too many attempts") });
    expect(deps.signInWithPassword).toHaveBeenCalledTimes(5); // the 6th never reached Supabase
    expect(deps.signedIn()).toBeNull();
  });

  it("counts per email: one blocked email doesn't block another", async () => {
    const limiter = newLimiter();
    const deps = fakeSupabase(accounts);
    for (let i = 0; i < 5; i++) await attemptAdminSignIn({ email: "staff@example.com", password: "bad", next: "" }, limiter, deps);
    const r = await attemptAdminSignIn({ ...ADMIN, next: "" }, limiter, deps);
    expect(r.ok).toBe(true);
  });

  it("validates input before touching Supabase", async () => {
    const deps = fakeSupabase(accounts);
    const r = await attemptAdminSignIn({ email: "not-an-email", password: "", next: "" }, newLimiter(), deps);
    expect(r).toMatchObject({ ok: false, fieldErrors: { email: expect.any(String), password: expect.any(String) } });
    expect(deps.signInWithPassword).not.toHaveBeenCalled();
  });
});
