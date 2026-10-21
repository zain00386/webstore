type MaybePromise<T> = T | Promise<T>;

/** What sign-in and checkout need from a limiter (in-memory or shared in the database). */
export type RateLimiter = {
  /** Is another attempt allowed right now? Does not record anything. */
  check(key: string): MaybePromise<{ allowed: boolean; retryAfterMs: number }>;
  /** Record an attempt. */
  fail(key: string): MaybePromise<void>;
  /** Forget a key's attempts. */
  reset(key: string): MaybePromise<void>;
};

/**
 * Simple in-memory sliding-window limiter. It only protects one server
 * instance; the website uses the shared database limiter (shared-rate-limit.ts),
 * which falls back to this if the database isn't updated yet.
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
