import { sanitizeStoredCart, type CartLine } from "@/lib/cart/cart";

/**
 * Tiny localStorage-backed store for useSyncExternalStore.
 * The server snapshot is null ("not loaded yet"), so server HTML never
 * guesses at a cart it can't see.
 */
const STORAGE_KEY = "dub-cart-v1";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();

let lastRaw: string | null | undefined;
let lastLines: CartLine[] = EMPTY;
/** Used when storage is blocked (e.g. some private modes): the cart lives in memory for this visit. */
let memoryFallback: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

export function getCartSnapshot(): CartLine[] {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastLines = raw ? sanitizeStoredCart(JSON.parse(raw)) : EMPTY;
    } catch {
      lastLines = EMPTY;
    }
  }
  return lastLines;
}

export function getCartServerSnapshot(): CartLine[] | null {
  return null;
}

export function writeCart(lines: CartLine[]): void {
  const raw = JSON.stringify(lines);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    memoryFallback = raw;
  }
  listeners.forEach((l) => l());
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the cart.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
