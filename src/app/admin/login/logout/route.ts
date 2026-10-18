import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { createSessionClient } from "@/lib/supabase/server";

/** POST /admin/login/logout — ends the admin session (clears the cookie). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const db = await createSessionClient();
  await db.auth.signOut();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
