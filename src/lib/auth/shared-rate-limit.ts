import "server-only";
import { createHmac } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { createRateLimiter, type RateLimiter } from "./rate-limit";

/**
 * Rate limiter shared by every server instance, stored in the database
 * (migration 0009). Keys (IP, phone, email) are scrambled with an HMAC before
 * they leave the server, so the database never holds them in readable form.
 * If the database functions are missing or unreachable, it falls back to the
 * in-memory limiter instead of blocking customers.
 */
export function createSharedRateLimiter({ bucket, limit, windowMs }: { bucket: string; limit: number; windowMs: number }): RateLimiter {
  const memory = createRateLimiter({ limit, windowMs });
  let warned = false;
  const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const hash = (key: string) => createHmac("sha256", secret()).update(`${bucket}:${key}`).digest("hex");
  const fallback = (what: string) => {
    if (!warned) console.warn(`[rate-limit] ${bucket}: shared limits unavailable (${what}); using this server's memory`);
    warned = true;
  };

  return {
    async check(key) {
      try {
        const { data, error } = await createServiceClient().rpc("rate_limit_check", {
          p_bucket: bucket,
          p_key_hash: hash(key),
          p_limit: limit,
          p_window_seconds: Math.round(windowMs / 1000),
        });
        if (error) throw error;
        const wait = Number(data ?? 0);
        return { allowed: wait === 0, retryAfterMs: wait * 1000 };
      } catch (e) {
        fallback((e as { code?: string }).code ?? "error");
        return memory.check(key);
      }
    },
    async fail(key) {
      memory.fail(key);
      try {
        const { error } = await createServiceClient().rpc("rate_limit_hit", { p_bucket: bucket, p_key_hash: hash(key) });
        if (error) throw error;
      } catch (e) {
        fallback((e as { code?: string }).code ?? "error");
      }
    },
    async reset(key) {
      memory.reset(key);
      try {
        await createServiceClient().rpc("rate_limit_reset", { p_bucket: bucket, p_key_hash: hash(key) });
      } catch {
        // nothing to do
      }
    },
  };
}
