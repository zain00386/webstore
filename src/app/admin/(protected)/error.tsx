"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

/** Shown inside the admin area when a page fails to load (e.g. the database is unreachable). */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Only the digest is logged; never log customer details.
    const digest = error instanceof Error && "digest" in error ? error.digest : undefined;
    console.error("Admin page error", digest ?? "");
  }, [error]);

  return (
    <div className="max-w-3xl">
      <EmptyState
        icon={AlertTriangle}
        title="This page couldn't load"
        description="Your changes so far are safe. Try again in a moment. If it keeps happening, run npm run db:check to see whether the database needs an update."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="pill" onClick={() => retry()}>
              Try again
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link href="/admin">Back to overview</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
