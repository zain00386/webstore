/**
 * Pure cart logic (no React, no storage) so it is easy to test and reuse.
 *
 * Everything here runs in the browser and is UNTRUSTED: prices and limits are
 * for display only. The server re-reads prices and stock at checkout (Phase 7-8).
 */
export type CartLine = {
  slug: string;
  title: string;
  publisher: string | null;
  coverUrl: string | null;
  /** Display price snapshot from when the book was added. */
  price: number;
  compareAtPrice: number | null;
  /** Stock known when added; quantities are clamped to it. */
  maxQuantity: number;
  quantity: number;
};

/** Hard ceiling per book, even when stock is higher. */
export const MAX_PER_LINE = 20;

export type CartItemInput = Omit<CartLine, "quantity">;

function clampQuantity(quantity: number, maxQuantity: number): number {
  const ceiling = Math.min(MAX_PER_LINE, Math.max(0, Math.floor(maxQuantity)));
  return Math.min(Math.max(0, Math.floor(quantity)), ceiling);
}

export function addItem(lines: CartLine[], item: CartItemInput, quantity = 1): CartLine[] {
  const existing = lines.find((l) => l.slug === item.slug);
  const nextQuantity = clampQuantity((existing?.quantity ?? 0) + quantity, item.maxQuantity);
  if (nextQuantity <= 0) return lines.filter((l) => l.slug !== item.slug);
  const line: CartLine = { ...item, quantity: nextQuantity };
  return existing ? lines.map((l) => (l.slug === item.slug ? line : l)) : [...lines, line];
}

export function setQuantity(lines: CartLine[], slug: string, quantity: number): CartLine[] {
  return lines
    .map((l) => (l.slug === slug ? { ...l, quantity: clampQuantity(quantity, l.maxQuantity) } : l))
    .filter((l) => l.quantity > 0);
}

export function removeItem(lines: CartLine[], slug: string): CartLine[] {
  return lines.filter((l) => l.slug !== slug);
}

export function itemCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function subtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

/** Validates data read back from localStorage; drops anything malformed. */
export function sanitizeStoredCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v): CartLine[] => {
    if (!v || typeof v !== "object") return [];
    const l = v as Record<string, unknown>;
    if (typeof l.slug !== "string" || typeof l.title !== "string") return [];
    if (typeof l.price !== "number" || typeof l.quantity !== "number" || typeof l.maxQuantity !== "number") return [];
    const quantity = clampQuantity(l.quantity, l.maxQuantity);
    if (quantity <= 0 || l.price < 0) return [];
    return [
      {
        slug: l.slug,
        title: l.title,
        publisher: typeof l.publisher === "string" ? l.publisher : null,
        coverUrl: typeof l.coverUrl === "string" ? l.coverUrl : null,
        price: l.price,
        compareAtPrice: typeof l.compareAtPrice === "number" ? l.compareAtPrice : null,
        maxQuantity: l.maxQuantity,
        quantity,
      },
    ];
  });
}
