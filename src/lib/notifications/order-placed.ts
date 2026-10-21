/**
 * "New order" messages (SMS, email, WhatsApp API...). None are connected yet,
 * so NOTHING is sent: the customer gets their on-page confirmation and private
 * link, and the shop sees the order in Admin > Orders.
 *
 * To connect a service later, add a channel to `channels` below (see
 * docs/notifications.md). A failing channel never affects the order.
 */
export type OrderPlacedNotice = {
  orderNumber: string;
  total: number;
  paymentMethod: "jazzcash" | "easypaisa" | "cod";
  deliveryMethod: "pakistan_post" | "courier";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  /** Full private link to the customer's order page (contains the secret). */
  orderUrl: string;
};

export type NotificationChannel = {
  name: string;
  /** True only when the service's keys are present in the environment. */
  isConfigured: () => boolean;
  send: (notice: OrderPlacedNotice) => Promise<void>;
};

export type NotifyResult = { channel: string; status: "sent" | "not_configured" | "failed" };

/** Connected services. Empty on purpose until a real provider is set up. */
export const channels: NotificationChannel[] = [];

export async function notifyOrderPlaced(
  notice: OrderPlacedNotice,
  list: NotificationChannel[] = channels,
): Promise<NotifyResult[]> {
  const results = await Promise.all(
    list.map(async (c): Promise<NotifyResult> => {
      if (!c.isConfigured()) return { channel: c.name, status: "not_configured" };
      try {
        await c.send(notice);
        return { channel: c.name, status: "sent" };
      } catch {
        return { channel: c.name, status: "failed" };
      }
    }),
  );
  // Order number only: customer details never go into logs.
  const summary = results.length ? results.map((r) => `${r.channel}: ${r.status}`).join(", ") : "no message service connected, nothing sent";
  console.info(`[notifications] ${notice.orderNumber}: ${summary}`);
  return results;
}
