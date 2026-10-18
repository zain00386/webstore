import { BadgeCheck, Banknote, MessageCircle, Truck } from "lucide-react";

/** Only claims the shop has confirmed: no delivery-time promises, no "24/7". */
const items = [
  { icon: Truck, title: "Delivery all over Pakistan", text: "From Rs. 300 with Pakistan Post" },
  { icon: Banknote, title: "Cash on Delivery", text: "With TCS / Leopards (Rs. 550)" },
  { icon: BadgeCheck, title: "Official Dogar branch", text: "Genuine books, never photocopies" },
  { icon: MessageCircle, title: "Help on WhatsApp", text: "0324-9574895, 10 AM - 9 PM (not Friday)" },
];

export function TrustRow() {
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
