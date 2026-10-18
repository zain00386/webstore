"use client";

import { useEffect, useState } from "react";
import { getShopStatus, type ShopStatus } from "@/lib/store-hours";
import { Badge } from "@/components/ui/badge";

const closedLabel = {
  "closed-day": "Shop closed today (Friday)",
  "before-open": "Shop opens at 10:00 AM",
  "after-close": "Shop closed now, opens 10:00 AM",
} as const;

/**
 * "Open now" / "Closed" badge for the physical shop.
 * Calculated in the visitor's browser after load, so cached pages never show a stale status.
 */
export function OpenStatus() {
  const [status, setStatus] = useState<ShopStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(getShopStatus(new Date()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!status) return null;
  return status.open ? (
    <Badge variant="success">Shop open now</Badge>
  ) : (
    <Badge variant="secondary">{closedLabel[status.reason]}</Badge>
  );
}
