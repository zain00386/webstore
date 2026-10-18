/**
 * Simple in-memory sliding-window limiter for sign-in attempts.
 * It protects a single server instance; Supabase Auth adds its own limits on
 * top. A shared store (e.g. a database table or Redis) can replace it later.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  function prune(key: string, now: number): number[] {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
    return recent;
  }

  return {
    /** Is another attempt allowed right now? Does not record anything. */
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
      const recent = prune(key, now);
      if (recent.length < limit) return { allowed: true, retryAfterMs: 0 };
      return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
    },
    /** Record a failed attempt. */
    fail(key: string, now = Date.now()) {
      hits.set(key, [...prune(key, now), now]);
    },
    /** Forget failures after a successful sign-in. */
    reset(key: string) {
      hits.delete(key);
    },
  };
}
