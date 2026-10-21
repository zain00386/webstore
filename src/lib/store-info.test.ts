import { describe, expect, it } from "vitest";
import type { PublicSettings } from "@/lib/supabase/database.types";
import { buildStoreInfo, cheapestDelivery, internationalPhone, splitPhones, telHref } from "./store-info";

const settings: PublicSettings = {
  store_name: "Dogar's Unique Books Rawalpindi",
  phone: "0324-9574895",
  whatsapp_e164: "923249574895",
  address: "Iqbal Road, Committee Chowk, Rawalpindi",
  hours_text: "10:00 AM - 9:00 PM, closed Friday",
  currency: "PKR",
  low_stock_threshold: 3,
  pakistan_post_enabled: true,
  pakistan_post_fee: 300,
  courier_enabled: true,
  courier_fee: 550,
  cod_enabled: true,
  jazzcash_enabled: true,
  easypaisa_enabled: true,
  bank_enabled: false,
  delivery_notes: "",
  banner_auto_vacancies: true,
};

describe("store info from settings", () => {
  it("uses the fees and switches from settings", () => {
    const info = buildStoreInfo({ ...settings, courier_fee: 600 });
    expect(info.delivery.map((o) => [o.id, o.charge, o.codAllowed])).toEqual([
      ["pakistan_post", 300, false],
      ["courier", 600, true],
    ]);
    expect(cheapestDelivery(info)).toBe(300);
    expect(info.payments).toEqual({ jazzcash: true, easypaisa: true, bank_transfer: false, cod: true });
  });

  it("hides switched-off delivery and turns COD off with it", () => {
    const noCourier = buildStoreInfo({ ...settings, courier_enabled: false });
    expect(noCourier.delivery.map((o) => o.id)).toEqual(["pakistan_post"]);
    expect(noCourier.payments.cod).toBe(false);
    const noCod = buildStoreInfo({ ...settings, cod_enabled: false });
    expect(noCod.delivery[1]).toMatchObject({ codAllowed: false, note: "Pay in advance" });
  });

  it("builds a maps link for a new address", () => {
    expect(buildStoreInfo({ ...settings, address: "Bank Road, Saddar" }).mapsUrl).toContain("Dogar's%20Unique%20Books%2C%20Bank%20Road%2C%20Saddar");
  });

  it("falls back to the built-in details without a database", () => {
    expect(buildStoreInfo(null).delivery).toHaveLength(2);
  });

  it("splits helpline numbers and keeps WhatsApp separate", () => {
    const info = buildStoreInfo({ ...settings, phone: "051-5533165, 051-5533169" });
    expect(info.phones).toEqual(["051-5533165", "051-5533169"]);
    expect(info.whatsappDisplay).toBe("0324-9574895");
    expect(splitPhones("051-5533165")).toEqual(["051-5533165"]);
    expect(telHref("051-5533165")).toBe("tel:0515533165");
    expect(internationalPhone("051-5533165")).toBe("+92-51-5533165");
    expect(internationalPhone("0324-9574895")).toBe("+92-324-9574895");
  });
});
