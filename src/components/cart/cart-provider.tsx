"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  addItem as addLine,
  itemCount,
  removeItem as removeLine,
  setQuantity as setLineQuantity,
  subtotal,
  type CartItemInput,
  type CartLine,
} from "@/lib/cart/cart";
import { getCartServerSnapshot, getCartSnapshot, subscribeCart, writeCart } from "./cart-store";

type CartContextValue = {
  lines: CartLine[];
  /** False until the saved cart has been read from this browser. */
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: CartItemInput, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const NO_LINES: CartLine[] = [];

export function CartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);
  const ready = snapshot !== null;
  const lines = snapshot ?? NO_LINES;

  // Always apply changes to the latest stored cart (handles quick repeated clicks).
  const update = useCallback((change: (current: CartLine[]) => CartLine[]) => writeCart(change(getCartSnapshot())), []);
  const add = useCallback((item: CartItemInput, quantity = 1) => update((l) => addLine(l, item, quantity)), [update]);
  const setQuantity = useCallback((slug: string, q: number) => update((l) => setLineQuantity(l, slug, q)), [update]);
  const remove = useCallback((slug: string) => update((l) => removeLine(l, slug)), [update]);
  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(
    () => ({ lines, ready, count: itemCount(lines), subtotal: subtotal(lines), add, setQuantity, remove, clear }),
    [lines, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
