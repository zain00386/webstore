import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { getSupabasePublicConfig } from "@/lib/env";
import { AdminNav, AdminNavList } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { SetupNotice } from "@/components/feedback/setup-notice";
import { Logo } from "@/components/layout/logo";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin shell. The sidebar is static; everything that depends on WHO is asking
 * sits inside <AdminGate>, which verifies the session and admin rights on the
 * server before any admin content renders.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="border-b border-border bg-surface p-3 lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 lg:mb-6 lg:block">
          <Logo />
          <span className="mt-2 hidden items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:flex">
            <ShieldCheck className="size-3.5" aria-hidden /> Admin
          </span>
        </div>
        <Suspense fallback={<AdminNavList pathname={null} />}>
          <AdminNav />
        </Suspense>
        <Link
          href="/"
          className="mt-4 hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <ExternalLink className="size-4" aria-hidden /> View shop
        </Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<AdminLoading />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </div>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="space-y-4 p-6" role="status">
      <span className="sr-only">Checking your access…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const config = getSupabasePublicConfig();
  if (!config.ok) {
    return (
      <div className="p-6">
        <SetupNotice problems={config.problems} />
      </div>
    );
  }
  const admin = await requireAdmin(); // redirects if signed out or not an admin
  return (
    <>
      <header className="flex flex-wrap items-center justify-end gap-3 border-b border-border px-4 py-3 lg:px-8">
        <span className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{admin.email}</span>
        </span>
        <SignOutButton />
      </header>
      <main id="main" className="flex-1 px-4 py-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
