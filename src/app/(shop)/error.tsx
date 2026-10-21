"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Only the digest is logged; never log customer details.
    const digest = error instanceof Error && "digest" in error ? error.digest : undefined;
    console.error("Page error", digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong"
        description="Please try again. If it keeps happening, WhatsApp us on 0324-9574895 or call the shop."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="pill" onClick={() => retry()}>
              Try again
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
