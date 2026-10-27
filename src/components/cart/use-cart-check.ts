"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cartRefs, reconcileCart, type CartIssue } from "@/lib/cart/reconcile";
import { checkCartBooks } from "@/app/(shop)/cart/actions";
import { getCartSnapshot, writeCart } from "./cart-store";

export type CartCheck = {
  status: "idle" | "checking" | "ok" | "error";
  issues: CartIssue[];
  error?: string;
  /** Re-check now (also runs automatically on page load and when the tab regains focus). */
  check: () => Promise<boolean>;
};

/**
 * Keeps the browser cart in line with the database: fresh prices, stock limits,
 * and flags for books that can't be bought. Resolves true when checkout can go ahead.
 */
export function useCartCheck(ready: boolean): CartCheck {
  const [status, setStatus] = useState<CartCheck["status"]>("idle");
  const [issues, setIssues] = useState<CartIssue[]>([]);
  const [error, setError] = useState<string>();
  const running = useRef<Promise<boolean> | null>(null);

  const check = useCallback(async () => {
    if (running.current) return running.current;
    const run = (async () => {
      const before = getCartSnapshot();
      if (before.length === 0) {
        setStatus("ok");
        return true;
      }
      // Re-checks after a good result (tab focus, Place order) run quietly: the last result stays on screen.
      setStatus((s) => (s === "ok" ? s : "checking"));
      const res = await checkCartBooks(cartRefs(before));
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return false;
      }
      // Reconcile the LATEST cart (the customer may have clicked while we waited).
      const { lines, issues: found } = reconcileCart(getCartSnapshot(), res.books);
      if (JSON.stringify(lines) !== JSON.stringify(getCartSnapshot())) writeCart(lines);
      if (found.length) setIssues((prev) => [...prev, ...found]);
      setError(undefined);
      setStatus("ok");
      return !lines.some((l) => l.status) && found.length === 0;
    })();
    running.current = run;
    try {
      return await run;
    } finally {
      running.current = null;
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [ready, check]);

  return { status, issues, error, check };
}

/** Plain-language description of a cart change. */
export function describeIssue(i: CartIssue, formatPrice: (n: number) => string): string {
  switch (i.kind) {
    case "price":
      return `“${i.title}”: price changed from ${formatPrice(i.from)} to ${formatPrice(i.to)}.`;
    case "reduced":
      return `“${i.title}”: only ${i.to} left, so the quantity was changed from ${i.from} to ${i.to}.`;
    case "out_of_stock":
      return `“${i.title}” is now out of stock. Remove it to continue.`;
    case "unavailable":
      return `“${i.title}” is no longer available. Remove it to continue.`;
  }
}
