import { describe, expect, it } from "vitest";
import { normalizeWalletNumber, paymentSettingsSchema, toSettingsRow } from "./payment-settings-schema";

const valid = {
  updatedAt: "2026-10-21T00:00:00Z",
  jazzcashEnabled: true,
  jazzcashTitle: "Dogar's Unique Books",
  jazzcashNumber: "+92 324 9574895",
  easypaisaEnabled: false,
  easypaisaTitle: "",
  easypaisaNumber: "",
  bankEnabled: true,
  bankName: "Meezan Bank",
  bankTitle: "Dogar's Unique Books",
  bankAccountNumber: "0123  4567-8901",
  bankIban: "pk36 scbl 0000 0011 2345 6702",
  instructions: "Send the screenshot on WhatsApp.",
};

describe("payment settings", () => {
  it("normalises wallet numbers", () => {
    expect(normalizeWalletNumber("03249574895")).toBe("0324-9574895");
    expect(normalizeWalletNumber("923249574895")).toBe("0324-9574895");
    expect(normalizeWalletNumber("0324 957 4895")).toBe("0324-9574895");
  });

  it("accepts valid details and cleans them up", () => {
    const s = paymentSettingsSchema.parse(valid);
    expect(s.jazzcashNumber).toBe("0324-9574895");
    expect(s.bankAccountNumber).toBe("0123 4567-8901");
    expect(s.bankIban).toBe("PK36SCBL0000001123456702");
    expect(s.easypaisaNumber).toBeNull();
    expect(toSettingsRow(s).bank_iban).toBe("PK36SCBL0000001123456702");
  });

  it("rejects bad numbers", () => {
    const errorsFor = (patch: Partial<typeof valid>) => {
      const r = paymentSettingsSchema.safeParse({ ...valid, ...patch });
      return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    };
    expect(errorsFor({ jazzcashNumber: "12345" })).toContain("jazzcashNumber");
    expect(errorsFor({ bankIban: "PK36" })).toContain("bankIban");
    expect(errorsFor({ bankAccountNumber: "abc123" })).toContain("bankAccountNumber");
  });

  it("needs the details for every method that is switched on", () => {
    const r = paymentSettingsSchema.safeParse({ ...valid, easypaisaEnabled: true, bankName: "" });
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["easypaisaNumber", "easypaisaTitle", "bankName"]));
  });

  it("keeps at least one prepaid method on (Pakistan Post needs it)", () => {
    const r = paymentSettingsSchema.safeParse({ ...valid, jazzcashEnabled: false, bankEnabled: false });
    expect(r.success).toBe(false);
  });

  it("allows switching a method off with its details left empty", () => {
    expect(paymentSettingsSchema.safeParse({ ...valid, bankEnabled: false, bankName: "", bankTitle: "", bankAccountNumber: "", bankIban: "" }).success).toBe(true);
  });
});
