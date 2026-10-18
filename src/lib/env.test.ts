import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNoLeakedSecrets, getSupabasePublicConfig, getSupabaseServiceConfig } from "./env";

const ANON = "anon-key-0123456789abcdef";
const SERVICE = "service-key-0123456789abcdef";

afterEach(() => vi.unstubAllEnvs());

describe("Supabase settings", () => {
  it("reports missing settings by name only", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const r = getSupabasePublicConfig();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.map((p) => p.name)).toEqual(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  });

  it("accepts valid settings and trims a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON);
    const r = getSupabasePublicConfig();
    expect(r).toEqual({ ok: true, value: { url: "https://abc.supabase.co", anonKey: ANON } });
  });

  it("rejects non-https URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON);
    expect(getSupabasePublicConfig().ok).toBe(false);
  });

  it("catches the anon key pasted as the service key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ANON);
    const r = getSupabaseServiceConfig();
    expect(r.ok).toBe(false);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE);
    expect(getSupabaseServiceConfig().ok).toBe(true);
  });

  it("refuses to run if a secret is named NEXT_PUBLIC_", () => {
    expect(() => assertNoLeakedSecrets({ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "x" })).toThrow(/would be sent/);
    expect(() => assertNoLeakedSecrets({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "x", SUPABASE_SERVICE_ROLE_KEY: "y" })).not.toThrow();
  });
});
