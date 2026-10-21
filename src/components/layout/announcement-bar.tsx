import { Truck } from "lucide-react";
import { formatPKR } from "@/lib/format";
import { getStoreInfo } from "@/lib/db/store-info";
import { cheapestDelivery } from "@/lib/store-info";

export async function AnnouncementBar() {
  const store = await getStoreInfo();
  const from = cheapestDelivery(store);
  const ways = [
    store.payments.jazzcash && "JazzCash",
    store.payments.easypaisa && "Easypaisa",
    store.payments.bank_transfer && "bank transfer",
    store.payments.cod && "Cash on Delivery",
  ].filter(Boolean) as string[];
  const waysText = ways.length > 1 ? `${ways.slice(0, -1).join(", ")} or ${ways.at(-1)}` : (ways[0] ?? "");
  return (
    <aside aria-label="Delivery and payment" className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      <p className="flex items-center justify-center gap-2">
        <Truck className="size-3.5 shrink-0" aria-hidden />
        <span>
          Delivery all over Pakistan{from !== null && ` from ${formatPKR(from)}`}
          {waysText && <span className="hidden sm:inline"> | {waysText}</span>}
          {store.payments.cod && <span className="sm:hidden"> | COD available</span>}
        </span>
      </p>
    </aside>
  );
}
