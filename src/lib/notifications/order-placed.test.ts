import { afterEach, describe, expect, it, vi } from "vitest";
import { channels, notifyOrderPlaced, type NotificationChannel, type OrderPlacedNotice } from "./order-placed";

const notice: OrderPlacedNotice = {
  orderNumber: "DUB-10001",
  total: 1250,
  paymentMethod: "cod",
  deliveryMethod: "courier",
  customerName: "Test Customer",
  customerPhone: "03001234567",
  customerEmail: null,
  orderUrl: "http://localhost:3000/order-confirmation/DUB-10001?t=x",
};

describe("order notifications", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends nothing while no service is connected (and never claims it did)", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(channels).toEqual([]);
    expect(await notifyOrderPlaced(notice)).toEqual([]);
    expect(log.mock.calls[0][0]).toContain("nothing sent");
  });

  it("skips unconfigured channels, reports failures without throwing, keeps details out of logs", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const send = vi.fn(async () => {});
    const list: NotificationChannel[] = [
      { name: "sms", isConfigured: () => false, send },
      { name: "email", isConfigured: () => true, send: async () => { throw new Error("down"); } },
      { name: "whatsapp", isConfigured: () => true, send },
    ];
    const results = await notifyOrderPlaced(notice, list);
    expect(results).toEqual([
      { channel: "sms", status: "not_configured" },
      { channel: "email", status: "failed" },
      { channel: "whatsapp", status: "sent" },
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0][0]);
    expect(line).not.toContain("03001234567");
    expect(line).not.toContain("Test Customer");
  });
});
