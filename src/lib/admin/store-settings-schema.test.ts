import { describe, expect, it } from "vitest";
import { fromWhatsAppE164, storeSettingsSchema, toStoreSettingsRow, toWhatsAppE164, type StoreSettingsInput } from "./store-settings-schema";

const valid: StoreSettingsInput = {
  updatedAt: "2026-10-21T00:00:00Z",
  phone: "0324 9574895",
  whatsapp: "+92 324 9574895",
  address: "Iqbal Road, Committee Chowk, Rawalpindi",
  pakistanPostEnabled: true,
  pakistanPostFee: "300",
  courierEnabled: true,
  courierFee: "550",
  codEnabled: true,
  deliveryNotes: "",
  lowStockThreshold: "3",
};
const errors = (patch: Partial<StoreSettingsInput>) => {
  const r = storeSettingsSchema.safeParse({ ...valid, ...patch });
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("store settings", () => {
  it("cleans up numbers and fees", () => {
    const row = toStoreSettingsRow(storeSettingsSchema.parse(valid));
    expect(row).toMatchObject({ phone: "0324-9574895", whatsapp_e164: "923249574895", pakistan_post_fee: 300, courier_fee: 550, low_stock_threshold: 3 });
    expect(toStoreSettingsRow(storeSettingsSchema.parse({ ...valid, lowStockThreshold: "", phone: "051 5551234" }))).toMatchObject({ low_stock_threshold: null, phone: "051 5551234" });
    expect(toStoreSettingsRow(storeSettingsSchema.parse({ ...valid, phone: "051-5533165,051-5533169" })).phone).toBe("051-5533165, 051-5533169");
  });

  it("converts WhatsApp numbers both ways", () => {
    expect(toWhatsAppE164("03249574895")).toBe("923249574895");
    expect(toWhatsAppE164("051-5551234")).toBeNull();
    expect(fromWhatsAppE164("923249574895")).toBe("0324-9574895");
  });

  it("rejects bad fees and numbers", () => {
    expect(errors({ courierFee: "550.50" })).toContain("courierFee");
    expect(errors({ pakistanPostFee: "20000" })).toContain("pakistanPostFee");
    expect(errors({ pakistanPostFee: "-5" })).toContain("pakistanPostFee");
    expect(errors({ whatsapp: "051 5551234" })).toContain("whatsapp");
    expect(errors({ phone: "call me" })).toContain("phone");
    expect(errors({ phone: "051-5533165, 051-5533169, 051-5533170" })).toContain("phone");
  });

  it("keeps at least one delivery option and COD only with the courier", () => {
    expect(errors({ pakistanPostEnabled: false, courierEnabled: false, codEnabled: false })).toContain("courierEnabled");
    expect(errors({ courierEnabled: false })).toContain("codEnabled");
    expect(errors({ courierEnabled: false, codEnabled: false })).toEqual([]);
  });
});
