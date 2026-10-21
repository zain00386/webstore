import { z } from "zod";

/** "0324 9574895", "+92 324 9574895" or "03249574895" → "0324-9574895". */
export function normalizeWalletNumber(raw: string): string {
  let digits = raw.replace(/[\s-]/g, "");
  if (digits.startsWith("+92")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("92") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return /^03\d{9}$/.test(digits) ? `${digits.slice(0, 4)}-${digits.slice(4)}` : raw.trim();
}

const text = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const optional = (s: z.ZodType<string, string>) => s.or(z.literal("")).transform((v) => v || null);

const walletNumber = optional(
  z
    .string()
    .transform(normalizeWalletNumber)
    .pipe(z.string().regex(/^03\d{2}-\d{7}$/, "Enter an 11-digit mobile number, e.g. 0324-9574895")),
);

const name = (max: number) => optional(text(max).min(2, "Too short"));

export const paymentSettingsSchema = z
  .object({
    updatedAt: z.string().min(1),
    jazzcashEnabled: z.boolean(),
    jazzcashTitle: name(120),
    jazzcashNumber: walletNumber,
    easypaisaEnabled: z.boolean(),
    easypaisaTitle: name(120),
    easypaisaNumber: walletNumber,
    bankEnabled: z.boolean(),
    bankName: name(80),
    bankTitle: name(120),
    bankAccountNumber: optional(
      z
        .string()
        .trim()
        .transform((v) => v.replace(/\s+/g, " "))
        .pipe(z.string().regex(/^[0-9][0-9 -]{4,38}[0-9]$/, "Use digits only (spaces or dashes are fine), 6 to 40 characters")),
    ),
    bankIban: optional(
      z
        .string()
        .transform((v) => v.replace(/\s+/g, "").toUpperCase())
        .pipe(z.string().regex(/^PK\d{2}[A-Z]{4}\d{16}$/, "A Pakistani IBAN has 24 characters, e.g. PK36SCBL0000001123456702")),
    ),
    instructions: text(2000),
  })
  .superRefine((v, ctx) => {
    const need = (on: boolean, field: keyof typeof v, message: string) => {
      if (on && !v[field]) ctx.addIssue({ code: "custom", path: [field], message });
    };
    need(v.jazzcashEnabled, "jazzcashNumber", "Needed while JazzCash is switched on");
    need(v.jazzcashEnabled, "jazzcashTitle", "Needed while JazzCash is switched on");
    need(v.easypaisaEnabled, "easypaisaNumber", "Needed while Easypaisa is switched on");
    need(v.easypaisaEnabled, "easypaisaTitle", "Needed while Easypaisa is switched on");
    need(v.bankEnabled, "bankName", "Needed while bank transfer is switched on");
    need(v.bankEnabled, "bankTitle", "Needed while bank transfer is switched on");
    need(v.bankEnabled, "bankAccountNumber", "Needed while bank transfer is switched on");
    if (!v.jazzcashEnabled && !v.easypaisaEnabled && !v.bankEnabled) {
      ctx.addIssue({
        code: "custom",
        path: ["jazzcashEnabled"],
        message: "Keep at least one of JazzCash, Easypaisa or bank transfer on: Pakistan Post orders must be paid in advance.",
      });
    }
  });

export type PaymentSettings = z.output<typeof paymentSettingsSchema>;

export function paymentSettingsFromFormData(fd: FormData) {
  const str = (k: string) => String(fd.get(k) ?? "");
  return {
    updatedAt: str("updatedAt"),
    jazzcashEnabled: fd.get("jazzcashEnabled") === "on",
    jazzcashTitle: str("jazzcashTitle"),
    jazzcashNumber: str("jazzcashNumber"),
    easypaisaEnabled: fd.get("easypaisaEnabled") === "on",
    easypaisaTitle: str("easypaisaTitle"),
    easypaisaNumber: str("easypaisaNumber"),
    bankEnabled: fd.get("bankEnabled") === "on",
    bankName: str("bankName"),
    bankTitle: str("bankTitle"),
    bankAccountNumber: str("bankAccountNumber"),
    bankIban: str("bankIban"),
    instructions: str("instructions"),
  };
}

/** Database column names for an update. */
export function toSettingsRow(s: PaymentSettings) {
  return {
    jazzcash_enabled: s.jazzcashEnabled,
    jazzcash_account_title: s.jazzcashTitle,
    jazzcash_number: s.jazzcashNumber,
    easypaisa_enabled: s.easypaisaEnabled,
    easypaisa_account_title: s.easypaisaTitle,
    easypaisa_number: s.easypaisaNumber,
    bank_enabled: s.bankEnabled,
    bank_name: s.bankName,
    bank_account_title: s.bankTitle,
    bank_account_number: s.bankAccountNumber,
    bank_iban: s.bankIban,
    payment_instructions: s.instructions,
  };
}
