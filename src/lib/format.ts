const pkr = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** Formats a whole-rupee amount as "Rs. 1,250". */
export function formatPKR(amount: number): string {
  return `Rs. ${pkr.format(Math.round(amount))}`;
}

/**
 * Whole-number discount percentage, or null when there is no real discount.
 * e.g. price 1800, compareAt 2500 -> 28
 */
export function discountPercent(
  price: number,
  compareAt: number | null | undefined,
): number | null {
  if (!compareAt || compareAt <= price || compareAt <= 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** wa.me link that opens WhatsApp with an optional pre-filled message. */
export function whatsappLink(phoneE164: string, message?: string): string {
  const base = `https://wa.me/${phoneE164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
