import { z } from "zod";

/**
 * Supabase settings from .env.local (or the hosting provider's settings).
 * Values are never logged or shown; only the NAMES of missing settings are reported.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url()
    .refine((v) => v.startsWith("https://") || v.startsWith("http://127.0.0.1") || v.startsWith("http://localhost"), {
      message: "must start with https://",
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "looks too short"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "looks too short"),
});

export type SupabasePublicConfig = { url: string; anonKey: string };
export type ConfigProblem = { name: string; problem: string };
export type ConfigResult<T> = { ok: true; value: T } | { ok: false; problems: ConfigProblem[] };

function toProblems(error: z.ZodError): ConfigProblem[] {
  return error.issues.map((i) => ({
    name: String(i.path[0]),
    problem: i.code === "invalid_type" ? "is missing" : i.message,
  }));
}

/** Settings that are safe in the browser (the anon/publishable key is public by design; RLS protects data). */
export function getSupabasePublicConfig(): ConfigResult<SupabasePublicConfig> {
  // Written out literally so Next.js can inline NEXT_PUBLIC_ values at build time.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  });
  if (!parsed.success) return { ok: false, problems: toProblems(parsed.error) };
  return {
    ok: true,
    value: {
      url: parsed.data.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, ""),
      anonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  };
}

/** SERVER ONLY. The service role key bypasses all security rules. */
export function getSupabaseServiceConfig(): ConfigResult<SupabasePublicConfig & { serviceKey: string }> {
  assertNoLeakedSecrets();
  const pub = getSupabasePublicConfig();
  const parsed = serverSchema.safeParse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined });
  const problems = [...(pub.ok ? [] : pub.problems), ...(parsed.success ? [] : toProblems(parsed.error))];
  if (!pub.ok || !parsed.success) return { ok: false, problems };
  if (parsed.data.SUPABASE_SERVICE_ROLE_KEY === pub.value.anonKey) {
    return {
      ok: false,
      problems: [{ name: "SUPABASE_SERVICE_ROLE_KEY", problem: "is the same as the anon key; copy the secret (service_role) key instead" }],
    };
  }
  return { ok: true, value: { ...pub.value, serviceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY } };
}

/**
 * Anything named NEXT_PUBLIC_* is bundled into the website for every visitor.
 * A secret there would be public, so refuse to run.
 */
export function assertNoLeakedSecrets(env: Record<string, string | undefined> = process.env): void {
  const leaked = Object.keys(env).filter(
    (k) => k.startsWith("NEXT_PUBLIC_") && /SERVICE|SECRET|PASSWORD|PRIVATE/i.test(k) && env[k],
  );
  if (leaked.length > 0) {
    throw new Error(
      `Security: ${leaked.join(", ")} would be sent to every visitor's browser. Remove the NEXT_PUBLIC_ prefix from secret settings.`,
    );
  }
}

export function describeProblems(problems: ConfigProblem[]): string {
  return problems.map((p) => `${p.name} ${p.problem}`).join("; ");
}
