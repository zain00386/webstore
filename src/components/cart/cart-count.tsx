"use client";

import { useSyncExternalStore } from "react";
import { useCart } from "./cart-provider";

const noopSubscribe = () => () => {};

/**
 * True only after THIS component has hydrated. The cart lives in browser
 * storage, so the server never knows the count; without this, a badge inside a
 * later-hydrating Suspense boundary (the tab bar) would mismatch the server HTML.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Small number bubble for cart links. Renders nothing for an empty cart. */
export function CartCount({ className = "" }: { className?: string }) {
  const { count, ready } = useCart();
  const hydrated = useHydrated();
  if (!hydrated || !ready || count === 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[0.7rem] leading-5 font-semibold text-brand-foreground ${className}`}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {count === 1 ? "item" : "items"} in cart</span>
    </span>
  );
}
