import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSupabasePublicConfig } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string };

export type AdminSession =
  | { state: "not-configured" }
  | { state: "signed-out" }
  | { state: "not-admin"; email: string }
  | { state: "admin"; user: AdminUser };

/**
 * Who is making this request? Verified on the server every time:
 * getUser() asks Supabase Auth to validate the session token (a cookie alone
 * is not trusted), then is_admin() checks the admin_users table.
 * cache() shares the answer between the layout and page of one request.
 */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  // Sessions are per request (and Supabase checks token expiry with the clock),
  // so tell Next.js this must never be prerendered.
  await connection();
  if (!getSupabasePublicConfig().ok) return { state: "not-configured" };
  const db = await createSessionClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { state: "signed-out" };
  const email = data.user.email ?? "";
  const { data: isAdmin, error: adminError } = await db.rpc("is_admin");
  if (adminError || isAdmin !== true) return { state: "not-admin", email };
  return { state: "admin", user: { id: data.user.id, email } };
});

/**
 * Call at the top of EVERY admin page and server action.
 * Hiding links is not security: this is the check that actually protects data.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await getAdminSession();
  if (session.state === "admin") return session.user;
  if (session.state === "not-admin") redirect("/admin/login?reason=forbidden");
  redirect("/admin/login");
}

/** For server actions that return a result instead of redirecting. */
export async function isAdminRequest(): Promise<boolean> {
  return (await getAdminSession()).state === "admin";
}
