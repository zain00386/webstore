import Link from "next/link";
import { Banknote, Headset, PackageSearch, Truck, type LucideIcon } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatPKR } from "@/lib/format";
import { getStoreInfo } from "@/lib/db/store-info";

/**
 * Four feature cards (delivery, COD, support, tracking). Only claims the shop has
 * confirmed: no "24/7", and a delivery time only once siteConfig.deliveryTime is set.
 */
export async function TrustRow() {
  const store = await getStoreInfo();
  const courier = store.delivery.find((o) => o.id === "courier");
  const cheapest = [...store.delivery].sort((a, b) => a.charge - b.charge)[0];
  const hours = `${siteConfig.hours.open.replace(":00", "")} - ${siteConfig.hours.close.replace(":00", "")}, not ${siteConfig.hours.closedDay}`;

  const cards: { icon: LucideIcon; title: string; text: string; href?: string }[] = [
    {
      icon: Truck,
      title: "Delivery all over Pakistan",
      text: [siteConfig.deliveryTime, cheapest && `From ${formatPKR(cheapest.charge)}`].filter(Boolean).join(". ") || "Pakistan Post or courier",
    },
    store.codAvailable && courier
      ? { icon: Banknote, title: "Cash on Delivery", text: `Pay the courier in cash (${courier.label})` }
      : { icon: Banknote, title: "Easy payment", text: "JazzCash, Easypaisa or bank transfer" },
    { icon: Headset, title: "Customer support", text: `Call or WhatsApp us, ${hours}` },
    { icon: PackageSearch, title: "Order tracking", text: "See your order status and courier tracking number", href: "/orders" },
  ];

  return (
    <section aria-label="Why order from us">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, title, text, href }) => {
          const body = (
            <>
              <Icon className="size-10 shrink-0 stroke-[1.4]" aria-hidden />
              <span className="min-w-0">
                <span className="block font-bold tracking-wide uppercase">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
              </span>
            </>
          );
          return (
            <li key={title}>
              {href ? (
                <Link href={href} className="flex h-full items-start gap-4 rounded-2xl bg-muted/70 p-5 hover:bg-muted">
                  {body}
                </Link>
              ) : (
                <div className="flex h-full items-start gap-4 rounded-2xl bg-muted/70 p-5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
