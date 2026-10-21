import { BadgeCheck, Banknote, MessageCircle, Truck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatPKR } from "@/lib/format";
import { getStoreInfo } from "@/lib/db/store-info";

/** Only claims the shop has confirmed: no delivery-time promises, no "24/7". */
export async function TrustRow() {
  const store = await getStoreInfo();
  const post = store.delivery.find((o) => o.id === "pakistan_post");
  const courier = store.delivery.find((o) => o.id === "courier");
  const cheapest = [...store.delivery].sort((a, b) => a.charge - b.charge)[0];
  const items = [
    {
      icon: Truck,
      title: "Delivery all over Pakistan",
      text: cheapest ? `From ${formatPKR(cheapest.charge)} with ${cheapest.label}` : "Ask us on WhatsApp",
    },
    store.codAvailable && courier
      ? { icon: Banknote, title: "Cash on Delivery", text: `With ${courier.label} (${formatPKR(courier.charge)})` }
      : { icon: Banknote, title: "Easy payment", text: post ? "JazzCash, Easypaisa or bank" : "Pay in advance online" },
    { icon: BadgeCheck, title: "Official Dogar branch", text: "Genuine books, never photocopies" },
    { icon: MessageCircle, title: "Help on WhatsApp", text: `${store.phoneDisplay}, ${siteConfig.hours.open.replace(":00", "")} - ${siteConfig.hours.close.replace(":00", "")} (not ${siteConfig.hours.closedDay})` },
  ];
  return (
    <section aria-label="Why order from us" className="rounded-3xl bg-surface p-4 ring-1 ring-border sm:p-5">
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-snug font-semibold">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
