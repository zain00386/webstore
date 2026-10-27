"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, PackageSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { whatsappLink } from "@/lib/format";
import {
  addRecentOrder,
  forgetOrder,
  orderPath,
  readRecentOrders,
  RECENT_ORDERS_KEY,
  sanitizeRecentOrders,
  type RecentOrder,
} from "@/lib/orders/recent-orders";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const listeners = new Set<() => void>();
let lastRaw: string | null | undefined;
let lastList: RecentOrder[] = [];

function snapshot(): RecentOrder[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RECENT_ORDERS_KEY);
  } catch {
    // storage blocked
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastList = sanitizeRecentOrders(JSON.parse(raw ?? "[]"));
    } catch {
      lastList = [];
    }
  }
  return lastList;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === RECENT_ORDERS_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const placedAt = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" });

/** Orders placed (or opened) on this device. Nothing here comes from our server. */
export function RecentOrdersList({ phoneDisplay, phoneE164 }: { phoneDisplay: string; phoneE164: string }) {
  const orders = useSyncExternalStore(subscribe, snapshot, () => null);

  if (orders === null) return <Skeleton className="h-40 w-full rounded-3xl" />;

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders on this device"
        description={`Orders you place on this phone or computer appear here. Ordered on another device or lost your link? WhatsApp us on ${phoneDisplay} with your name and phone number.`}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="pill">
              <Link href="/books">Browse books</Link>
            </Button>
            <Button asChild variant="outline" size="pill">
              <a href={whatsappLink(phoneE164, "Assalam-o-Alaikum, I need help finding my order.")} target="_blank" rel="noopener noreferrer">
                WhatsApp us
              </a>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-3xl bg-card ring-1 ring-border">
      {orders.map((o) => (
        <li key={o.orderNumber} className="flex items-center gap-2 p-2 pl-4">
          <Link href={orderPath(o)} className="flex min-h-12 flex-1 items-center justify-between gap-3 rounded-xl px-1 transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <span>
              <span className="block font-semibold tracking-wide">{o.orderNumber}</span>
              <span className="block text-xs text-muted-foreground">
                {Date.parse(o.at) > 0 ? `Placed ${placedAt.format(new Date(o.at))}` : "Saved on this device"}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-brand">
              View <ChevronRight className="size-4" aria-hidden />
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${o.orderNumber} from this device`}
            onClick={() => {
              forgetOrder(o.orderNumber);
              listeners.forEach((l) => l());
              toast(`Removed ${o.orderNumber} from this device`, {
                action: {
                  label: "Undo",
                  onClick: () => {
                    // Put back the same entry (with its original date), not a fresh one.
                    try {
                      window.localStorage.setItem(RECENT_ORDERS_KEY, JSON.stringify(addRecentOrder(readRecentOrders(), o)));
                    } catch {
                      // storage blocked
                    }
                    listeners.forEach((l) => l());
                  },
                },
              });
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
