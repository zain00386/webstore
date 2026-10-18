import type { CartLine } from "@/lib/cart/cart";
import { formatPKR } from "@/lib/format";
import { deliveryOptions } from "@/config/site";
import { deliveryCharge, paymentLabels } from "./rules";
import type { CheckoutData } from "./schema";

/**
 * Text of the order message the customer sends to the shop on WhatsApp.
 * Interim ordering channel until online orders go live (Phase 8).
 */
export function buildWhatsAppOrderMessage(lines: CartLine[], data: CheckoutData): string {
  const itemsSubtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const delivery = deliveryCharge(data.deliveryMethod);
  const deliveryLabel = deliveryOptions.find((o) => o.id === data.deliveryMethod)?.label ?? data.deliveryMethod;
  const items = lines.map((l, i) => `${i + 1}. ${l.title} x ${l.quantity} = ${formatPKR(l.price * l.quantity)}`);

  return [
    "Assalam-o-Alaikum, I would like to order:",
    "",
    ...items,
    "",
    `Subtotal: ${formatPKR(itemsSubtotal)}`,
    `Delivery: ${deliveryLabel} ${formatPKR(delivery)}`,
    `Total: ${formatPKR(itemsSubtotal + delivery)}`,
    `Payment: ${paymentLabels[data.paymentMethod]}`,
    "",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    ...(data.email ? [`Email: ${data.email}`] : []),
    `Address: ${data.address}, ${data.city}`,
    ...(data.notes ? [`Notes: ${data.notes}`] : []),
  ].join("\n");
}
