import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS, withSessionMaxAge } from "./cookie-options";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeProblems, getSupabasePublicConfig, getSupabaseServiceConfig } from "@/lib/env";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

export class SupabaseNotConfiguredError extends Error {
  constructor(details: string) {
    super(`Supabase is not set up yet: ${details}. See docs/database-setup.md.`);
    this.name = "SupabaseNotConfiguredError";
  }
}

/**
 * Visitor-level access (anon key, no login). Safe for public pages and for
 * cached functions, because it never reads cookies. RLS limits it to public data.
 */
export function createPublicClient(): Db {
  const config = getSupabasePublicConfig();
  if (!config.ok) throw new SupabaseNotConfiguredError(describeProblems(config.problems));
  return createClient<Database>(config.value.url, config.value.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Acts as the signed-in user from the request cookies (admin area, Phase 5).
 * RLS decides what they can do, so a non-admin session gets visitor rights.
 */
export async function createSessionClient(): Promise<Db> {
  const config = getSupabasePublicConfig();
  if (!config.ok) throw new SupabaseNotConfiguredError(describeProblems(config.problems));
  const cookieStore = await cookies();
  return createServerClient<Database>(config.value.url, config.value.anonKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, withSessionMaxAge(options)));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions.
        }
      },
    },
  });
}

/**
 * SERVER ONLY, bypasses RLS. Use only in trusted server code that has already
 * checked permissions itself (e.g. placing an order with re-checked prices).
 */
export function createServiceClient(): Db {
  const config = getSupabaseServiceConfig();
  if (!config.ok) throw new SupabaseNotConfiguredError(describeProblems(config.problems));
  return createClient<Database>(config.value.url, config.value.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
