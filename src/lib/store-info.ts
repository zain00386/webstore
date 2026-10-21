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
  /** Helpline numbers as typed in settings, e.g. "051-5533165, 051-5533169". */
  phoneDisplay: string;
  /** The same numbers one by one, for separate call links. */
  phones: string[];
  /** WhatsApp number in international form without "+" (wa.me links). */
  phoneE164: string;
  /** WhatsApp number as customers read it, e.g. "0324-9574895". */
  whatsappDisplay: string;
  address: string;
  mapsUrl: string;
  /** Only the options switched on in settings. */
  delivery: DeliveryOption[];
  deliveryNotes: string;
  codAvailable: boolean;
  payments: PaymentAvailability;
};

/** Google Maps searches for the shop's name plus the address, so it lands on the shop's own pin. */
export const mapsQueryFor = (address: string) => `Dogar's Unique Books, ${address}`;
const mapsFor = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQueryFor(address))}`;
/** Map to show inside the page (no API key needed). */
export const mapsEmbedFor = (address: string) => `https://www.google.com/maps?q=${encodeURIComponent(mapsQueryFor(address))}&output=embed`;

export function buildStoreInfo(s: PublicSettings | null): StoreInfo {
  if (!s) {
    return {
      phoneDisplay: siteConfig.phoneDisplay,
      phones: splitPhones(siteConfig.phoneDisplay),
      phoneE164: siteConfig.phoneE164,
      whatsappDisplay: siteConfig.whatsappDisplay,
      address: siteConfig.address,
      mapsUrl: mapsFor(siteConfig.address),
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
    phones: splitPhones(s.phone),
    phoneE164: s.whatsapp_e164,
    whatsappDisplay: whatsappDisplay(s.whatsapp_e164),
    address: s.address,
    mapsUrl: mapsFor(s.address),
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

/** "051-5533165, 051-5533169" -> ["051-5533165", "051-5533169"]. */
export function splitPhones(value: string): string[] {
  return value
    .split(/[,;/]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** "923249574895" -> "0324-9574895". */
export function whatsappDisplay(e164: string): string {
  return /^92\d{10}$/.test(e164) ? `0${e164.slice(2, 5)}-${e164.slice(5)}` : e164;
}

/** tel: link for ONE phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** "051-5533165" -> "+92-51-5533165" (for Google's store data). */
export function internationalPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("92")) return `+${digits}`;
  return digits.startsWith("0") ? `+92-${digits.slice(1, digits.startsWith("03") ? 4 : 3)}-${digits.slice(digits.startsWith("03") ? 4 : 3)}` : phone;
}
