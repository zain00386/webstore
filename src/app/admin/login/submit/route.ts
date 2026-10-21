import { NextResponse } from "next/server";
import { createSharedRateLimiter } from "@/lib/auth/shared-rate-limit";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { attemptAdminSignIn } from "@/lib/auth/sign-in";
import { createSessionClient } from "@/lib/supabase/server";

/**
 * POST /admin/login/submit — admin sign-in.
 * A route handler (not a server action) so setting the session cookie never
 * re-renders a page inside the same request (avoids a Next.js 16 cookie bug).
 * The browser then loads the admin page as a fresh request.
 */

// 5 failed attempts per email + network address in 15 minutes, shared by all
// servers (Supabase Auth also applies its own sign-in limits).
const limiter = createSharedRateLimiter({ bucket: "admin_login", limit: 5, windowMs: 15 * 60_000 });

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Request not allowed." }, { status: 403, headers: noStore });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400, headers: noStore });
  }

  const db = await createSessionClient();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const result = await attemptAdminSignIn({ email: body.email, password: body.password, next: body.next }, limiter, {
    clientKey: ip,
    signInWithPassword: async (email, password) => ({ ok: !(await db.auth.signInWithPassword({ email, password })).error }),
    isAdmin: async () => (await db.rpc("is_admin")).data === true,
    signOut: async () => {
      await db.auth.signOut();
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: noStore });
}
