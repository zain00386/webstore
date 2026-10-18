import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { safeAdminNext } from "@/lib/auth/safe-next";
import { getSupabasePublicConfig } from "@/lib/env";
import { Logo } from "@/components/layout/logo";
import { Alert } from "@/components/feedback/alert";
import { SetupNotice } from "@/components/feedback/setup-notice";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border">
          <h1 className="mb-1 text-xl font-semibold">Admin sign in</h1>
          <p className="mb-6 text-sm text-muted-foreground">For the shop owner and staff only.</p>
          <Suspense fallback={<Skeleton className="h-56 w-full rounded-2xl" />}>
            {searchParams.then((p) => (
              <LoginBody
                next={typeof p.next === "string" ? p.next : undefined}
                reason={typeof p.reason === "string" ? p.reason : undefined}
                signedOut={p.signed_out === "1"}
              />
            ))}
          </Suspense>
        </div>
        <p className="text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground hover:underline">
            ← Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}

async function LoginBody({ next, reason, signedOut }: { next?: string; reason?: string; signedOut: boolean }) {
  const config = getSupabasePublicConfig();
  if (!config.ok) return <SetupNotice problems={config.problems} />;

  const session = await getAdminSession();
  if (session.state === "admin") redirect(safeAdminNext(next));

  return (
    <div className="space-y-4">
      {signedOut && <Alert tone="success">You have signed out.</Alert>}
      {(reason === "forbidden" || session.state === "not-admin") && (
        <Alert tone="warning" title="No admin access">
          {session.state === "not-admin"
            ? `You're signed in as ${session.email}, which is not an admin account.`
            : "That account doesn't have admin access."}
        </Alert>
      )}
      {session.state === "not-admin" ? (
        <SignOutButton label="Sign out and use another account" className="w-full" />
      ) : (
        <LoginForm next={safeAdminNext(next)} />
      )}
    </div>
  );
}
