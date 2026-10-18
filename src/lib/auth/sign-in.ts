import { loginSchema } from "./login-schema";
import type { createRateLimiter } from "./rate-limit";
import { safeAdminNext } from "./safe-next";

/** What the sign-in needs from the outside world (Supabase in real use, fakes in tests). */
export type SignInDeps = {
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean }>;
  isAdmin: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clientKey: string;
};

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error?: string; fieldErrors?: { email?: string; password?: string }; email: string };

/**
 * The admin sign-in decision, independent of Next.js so it can be unit tested.
 * Order matters: validate → rate limit → password → admin check.
 */
export async function attemptAdminSignIn(
  input: { email: unknown; password: unknown; next: unknown },
  limiter: ReturnType<typeof createRateLimiter>,
  deps: SignInDeps,
): Promise<SignInResult> {
  const rawEmail = String(input.email ?? "");
  const parsed = loginSchema.safeParse({ email: rawEmail, password: input.password ?? "" });
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return { ok: false, fieldErrors: { email: fields.email?.[0], password: fields.password?.[0] }, email: rawEmail };
  }
  const { email, password } = parsed.data;
  const key = `${deps.clientKey}|${email}`;

  const limit = limiter.check(key);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterMs / 60_000));
    return { ok: false, error: `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`, email };
  }

  const { ok } = await deps.signInWithPassword(email, password);
  if (!ok) {
    limiter.fail(key);
    // Same message for a wrong email or a wrong password, so accounts can't be guessed.
    return { ok: false, error: "Incorrect email or password.", email };
  }

  if (!(await deps.isAdmin())) {
    // Never leave a non-admin signed in to the admin area.
    await deps.signOut();
    limiter.fail(key);
    return { ok: false, error: "This account doesn't have admin access.", email };
  }

  limiter.reset(key);
  return { ok: true, redirectTo: safeAdminNext(String(input.next ?? "")) };
}
