import { describe, expect, it } from "vitest";
import { isPaymentAllowed } from "./rules";
import { checkoutSchema, normalizePhone } from "./schema";

describe("delivery and payment rules", () => {
  it("allows COD only with the courier", () => {
    expect(isPaymentAllowed("pakistan_post", "cod")).toBe(false);
    expect(isPaymentAllowed("courier", "cod")).toBe(true);
    expect(isPaymentAllowed("pakistan_post", "jazzcash")).toBe(true);
    expect(isPaymentAllowed("courier", "easypaisa")).toBe(true);
  });
});

const valid = {
  name: "Ali Khan",
  phone: "0300-1234567",
  email: "",
  address: "House 12, Street 4, Satellite Town",
  city: "Rawalpindi",
  notes: "",
  deliveryMethod: "courier",
  paymentMethod: "cod",
};

describe("checkoutSchema", () => {
  it("accepts a valid order and normalizes the phone", () => {
    const result = checkoutSchema.parse(valid);
    expect(result.phone).toBe("03001234567");
  });

  it("accepts +92 and 0092 phone formats", () => {
    expect(normalizePhone("+92 300 1234567")).toBe("03001234567");
    expect(normalizePhone("00923001234567")).toBe("03001234567");
  });

  it("rejects bad phone numbers and short addresses", () => {
    const r = checkoutSchema.safeParse({ ...valid, phone: "12345", address: "Pindi" });
    expect(r.success).toBe(false);
    const fields = r.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["phone", "address"]));
  });

  it("rejects COD with Pakistan Post", () => {
    const r = checkoutSchema.safeParse({ ...valid, deliveryMethod: "pakistan_post", paymentMethod: "cod" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["paymentMethod"]);
  });

  it("rejects unknown delivery or payment methods", () => {
    expect(checkoutSchema.safeParse({ ...valid, deliveryMethod: "free" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, paymentMethod: "card" }).success).toBe(false);
  });

  it("validates optional email only when given", () => {
    expect(checkoutSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, email: "ali@example.com" }).success).toBe(true);
  });
});
