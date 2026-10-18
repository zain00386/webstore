"use client";

import { useCart } from "./cart-provider";

/** Small number bubble for cart links. Renders nothing for an empty cart. */
export function CartCount({ className = "" }: { className?: string }) {
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[0.7rem] leading-5 font-semibold text-brand-foreground ${className}`}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {count === 1 ? "item" : "items"} in cart</span>
    </span>
  );
}
