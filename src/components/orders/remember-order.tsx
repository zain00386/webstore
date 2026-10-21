"use client";

import { useEffect } from "react";
import { rememberOrder } from "@/lib/orders/recent-orders";

/**
 * Saves this order under "My orders" on the device viewing it, e.g. when the
 * customer opens their order link on their phone. Only runs for a valid link.
 */
export function RememberOrder({ orderNumber, token }: { orderNumber: string; token: string }) {
  useEffect(() => rememberOrder(orderNumber, token), [orderNumber, token]);
  return null;
}
