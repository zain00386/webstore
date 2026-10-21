/**
 * Admin login cookies. Only server code reads them (there is no Supabase client
 * in the browser), so scripts in the page can't see them (httpOnly). On the live
 * site they are sent over HTTPS only.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/** An admin who hasn't used the admin area for 7 days must sign in again. */
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Supabase always asks for a 400-day cookie; we shorten it to 7 days (each
 * admin visit refreshes it). Deleting a cookie (maxAge 0) is left as is.
 */
export function withSessionMaxAge<T extends { maxAge?: number }>(options: T): T {
  return options.maxAge === 0 ? options : { ...options, maxAge: SESSION_MAX_AGE };
}
