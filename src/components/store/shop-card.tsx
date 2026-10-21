import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { siteConfig } from "@/config/site";
import { whatsappLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { OpenStatus } from "./open-status";
import { getStoreInfo } from "@/lib/db/store-info";
import { telHref } from "@/lib/store-info";

export async function ShopCard() {
  const store = await getStoreInfo();
  return (
    <section aria-labelledby="shop-card-title" className="not-prose rounded-3xl bg-surface p-6 ring-1 ring-border">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="shop-card-title" className="text-lg font-semibold">
          {siteConfig.fullName}
        </h2>
        <OpenStatus />
      </div>
      <ul className="space-y-3 text-sm">
        <li className="flex gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          {store.address}
        </li>
        <li className="flex gap-3">
          <Phone className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          Helpline: {store.phones.join(", ")}
        </li>
        <li className="flex gap-3">
          <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-whatsapp" />
          WhatsApp: {store.whatsappDisplay}
        </li>
        <li className="flex gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            Saturday to Thursday, {siteConfig.hours.open} - {siteConfig.hours.close}
            <br />
            Friday closed (online orders still accepted)
          </span>
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild className="bg-whatsapp text-white hover:bg-whatsapp/90">
          <a href={whatsappLink(store.phoneE164)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> Chat on WhatsApp
          </a>
        </Button>
        {store.phones.map((p) => (
          <Button key={p} asChild variant="outline">
            <a href={telHref(p)}>
              <Phone aria-hidden /> Call {p}
            </a>
          </Button>
        ))}
        <Button asChild variant="outline">
          <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation aria-hidden /> Get directions
          </a>
        </Button>
      </div>
    </section>
  );
}
