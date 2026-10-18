/**
 * Shop opening rules (Pakistan time): 10:00-21:00, closed Friday.
 * Kept as pure functions so they can be unit tested.
 */
const OPEN_HOUR = 10;
const CLOSE_HOUR = 21;
const CLOSED_WEEKDAY = "Fri";

export type ShopStatus =
  | { open: true }
  | { open: false; reason: "closed-day" | "before-open" | "after-close" };

export function getShopStatus(now: Date): ShopStatus {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);

  if (weekday === CLOSED_WEEKDAY) return { open: false, reason: "closed-day" };
  if (hour < OPEN_HOUR) return { open: false, reason: "before-open" };
  if (hour >= CLOSE_HOUR) return { open: false, reason: "after-close" };
  return { open: true };
}
