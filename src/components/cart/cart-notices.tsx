"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { formatPKR } from "@/lib/format";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { describeIssue, type CartCheck } from "./use-cart-check";

/** Shows what the server check changed (prices, quantities, unavailable books). */
export function CartNotices({ check, blocking }: { check: CartCheck; blocking: boolean }) {
  return (
    <div className="space-y-3" aria-live="polite">
      {check.status === "checking" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Checking prices and stock…
        </p>
      )}
      {check.status === "error" && (
        <Alert tone="error" title="Couldn't check your cart">
          <p>{check.error}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => void check.check()}>
            <RefreshCw aria-hidden /> Try again
          </Button>
        </Alert>
      )}
      {check.issues.length > 0 && (
        <Alert tone="warning" title="Your cart was updated">
          <ul className="list-disc space-y-1 pl-4">
            {check.issues.map((i, n) => (
              <li key={n}>{describeIssue(i, formatPKR)}</li>
            ))}
          </ul>
        </Alert>
      )}
      {blocking && check.issues.length === 0 && check.status !== "checking" && (
        <Alert tone="warning">Some books in your cart can&apos;t be bought right now. Remove them to continue.</Alert>
      )}
    </div>
  );
}
