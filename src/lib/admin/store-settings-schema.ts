import { z } from "zod";
import { normalizeWalletNumber } from "./payment-settings-schema";

/** "0324 9574895" / "+92 324 9574895" -> "923249574895" (for wa.me links). */
export function toWhatsAppE164(raw: string): string | null {
  const local = normalizeWalletNumber(raw);
  return /^03\d{2}-\d{7}$/.test(local) ? `92${local.slice(1).replace("-", "")}` : null;
}

/** "923249574895" -> "0324-9574895" for the form. */
export function fromWhatsAppE164(e164: string): string {
  return /^92\d{10}$/.test(e164) ? `0${e164.slice(2, 5)}-${e164.slice(5)}` : e164;
}

const fee = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,5}$/, `${label}: whole rupees, e.g. 300`)
    .transform(Number)
    .refine((n) => n <= 10000, `${label} can be at most Rs. 10,000`);

export const storeSettingsSchema = z
  .object({
    updatedAt: z.string().min(1),
    phone: z
      .string()
      .trim()
      .transform((v) => (/^(\+?92|0)3\d{2}[\s-]?\d{7}$/.test(v.replace(/\s+/g, "")) ? normalizeWalletNumber(v) : v.replace(/\s+/g, " ")))
      .pipe(z.string().regex(/^[0-9+][0-9 -]{6,18}[0-9]$/, "Enter a phone number, e.g. 0324-9574895")),
    whatsapp: z
      .string()
      .transform((v) => toWhatsAppE164(v) ?? "")
      .pipe(z.string().min(1, "Enter a Pakistani mobile number, e.g. 0324-9574895")),
    address: z.string().trim().min(5, "Enter the shop address").max(300, "At most 300 characters"),
    pakistanPostEnabled: z.boolean(),
    pakistanPostFee: fee("Pakistan Post fee"),
    courierEnabled: z.boolean(),
    courierFee: fee("Courier fee"),
    codEnabled: z.boolean(),
    deliveryNotes: z.string().trim().max(500, "At most 500 characters"),
    lowStockThreshold: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d{1,4}$/.test(v) && Number(v) <= 1000), "A whole number from 0 to 1000, or empty")
      .transform((v) => (v === "" ? null : Number(v))),
  })
  .superRefine((v, ctx) => {
    if (!v.pakistanPostEnabled && !v.courierEnabled) {
      ctx.addIssue({ code: "custom", path: ["courierEnabled"], message: "Keep at least one delivery option on." });
    }
    if (v.codEnabled && !v.courierEnabled) {
      ctx.addIssue({ code: "custom", path: ["codEnabled"], message: "Cash on Delivery works only with the courier: switch the courier on, or COD off." });
    }
  });

export type StoreSettingsInput = {
  updatedAt: string;
  phone: string;
  whatsapp: string;
  address: string;
  pakistanPostEnabled: boolean;
  pakistanPostFee: string;
  courierEnabled: boolean;
  courierFee: string;
  codEnabled: boolean;
  deliveryNotes: string;
  lowStockThreshold: string;
};

export function storeSettingsFromFormData(fd: FormData): StoreSettingsInput {
  const s = (k: string) => String(fd.get(k) ?? "");
  return {
    updatedAt: s("updatedAt"),
    phone: s("phone"),
    whatsapp: s("whatsapp"),
    address: s("address"),
    pakistanPostEnabled: fd.get("pakistanPostEnabled") === "on",
    pakistanPostFee: s("pakistanPostFee"),
    courierEnabled: fd.get("courierEnabled") === "on",
    courierFee: s("courierFee"),
    codEnabled: fd.get("codEnabled") === "on",
    deliveryNotes: s("deliveryNotes"),
    lowStockThreshold: s("lowStockThreshold"),
  };
}

export function toStoreSettingsRow(v: z.output<typeof storeSettingsSchema>) {
  return {
    phone: v.phone,
    whatsapp_e164: v.whatsapp,
    address: v.address,
    pakistan_post_enabled: v.pakistanPostEnabled,
    pakistan_post_fee: v.pakistanPostFee,
    courier_enabled: v.courierEnabled,
    courier_fee: v.courierFee,
    cod_enabled: v.codEnabled,
    delivery_notes: v.deliveryNotes,
    low_stock_threshold: v.lowStockThreshold,
  };
}
