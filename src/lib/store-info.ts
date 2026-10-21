import { deliveryOptions as defaultDelivery, siteConfig } from "@/config/site";
import type { PublicSettings } from "@/lib/supabase/database.types";
import { formatPKR } from "@/lib/format";
import type { DeliveryMethod, PaymentAvailability } from "@/lib/checkout/rules";

/**
 * Store details and delivery options as customers see them: from Admin >
 * Settings when the database is set up, otherwise the defaults in
 * src/config/site.ts. The order total itself is always calculated by the
 * database (place_order), never from these numbers.
 */
export type DeliveryOption = {
  id: DeliveryMethod;
  label: string;
  note: string;
  charge: number;
  /** Cash on Delivery possible with this option right now. */
  codAllowed: boolean;
};

export type StoreInfo = {
  phoneDisplay: string;
  phoneE164: string;
  address: string;
  mapsUrl: string;
  /** Only the options switched on in settings. */
  delivery: DeliveryOption[];
  deliveryNotes: string;
  codAvailable: boolean;
  payments: PaymentAvailability;
};

const mapsFor = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function buildStoreInfo(s: PublicSettings | null): StoreInfo {
  if (!s) {
    return {
      phoneDisplay: siteConfig.phoneDisplay,
      phoneE164: siteConfig.phoneE164,
      address: siteConfig.address,
      mapsUrl: siteConfig.mapsUrl,
      delivery: defaultDelivery.map((o) => ({ id: o.id, label: o.label, note: o.note, charge: o.charge, codAllowed: o.codAllowed })),
      deliveryNotes: "",
      codAvailable: true,
      payments: { jazzcash: true, easypaisa: true, bank_transfer: false, cod: true },
    };
  }
  const codAvailable = s.cod_enabled && s.courier_enabled;
  const prepaid = [s.jazzcash_enabled && "JazzCash", s.easypaisa_enabled && "Easypaisa", s.bank_enabled && "bank transfer"].filter(Boolean).join(", ");
  const delivery: DeliveryOption[] = [];
  if (s.pakistan_post_enabled) {
    delivery.push({ id: "pakistan_post", label: "Pakistan Post", note: `All over Pakistan, pay in advance${prepaid ? ` (${prepaid})` : ""}`, charge: Number(s.pakistan_post_fee), codAllowed: false });
  }
  if (s.courier_enabled) {
    delivery.push({
      id: "courier",
      label: "TCS / Leopards / M&P",
      note: codAvailable ? "Cash on Delivery available, or pay in advance" : "Pay in advance",
      charge: Number(s.courier_fee),
      codAllowed: codAvailable,
    });
  }
  return {
    phoneDisplay: s.phone,
    phoneE164: s.whatsapp_e164,
    address: s.address,
    mapsUrl: s.address === siteConfig.address ? siteConfig.mapsUrl : mapsFor(s.address),
    delivery,
    deliveryNotes: s.delivery_notes ?? "",
    codAvailable,
    payments: {
      jazzcash: s.jazzcash_enabled,
      easypaisa: s.easypaisa_enabled,
      bank_transfer: Boolean(s.bank_enabled),
      cod: codAvailable,
    },
  };
}

/** "from Rs. 300" for banners, using the cheapest switched-on option. */
export function cheapestDelivery(info: StoreInfo): number | null {
  return info.delivery.length ? Math.min(...info.delivery.map((o) => o.charge)) : null;
}

export function deliveryLine(info: StoreInfo): string {
  return info.delivery.map((o) => `${o.label} ${formatPKR(o.charge)}`).join(" · ");
}

/** tel: link for the shop's phone number as typed in settings. */
export function telHref(info: Pick<StoreInfo, "phoneDisplay">): string {
  return `tel:${info.phoneDisplay.replace(/[^\d+]/g, "")}`;
}
