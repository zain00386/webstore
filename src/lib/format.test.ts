import { describe, expect, it } from "vitest";
import { discountPercent, formatPKR, whatsappLink } from "./format";

describe("formatPKR", () => {
  it("adds the Rs. prefix and thousands separators", () => {
    expect(formatPKR(1250)).toBe("Rs. 1,250");
    expect(formatPKR(300)).toBe("Rs. 300");
    expect(formatPKR(0)).toBe("Rs. 0");
  });

  it("rounds to whole rupees", () => {
    expect(formatPKR(1249.6)).toBe("Rs. 1,250");
  });
});

describe("discountPercent", () => {
  it("returns the rounded saving", () => {
    expect(discountPercent(1800, 2500)).toBe(28);
    expect(discountPercent(1500, 1800)).toBe(17);
  });

  it("returns null when there is no real discount", () => {
    expect(discountPercent(800, null)).toBeNull();
    expect(discountPercent(800, 800)).toBeNull();
    expect(discountPercent(900, 800)).toBeNull();
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappLink("923249574895")).toBe("https://wa.me/923249574895");
    expect(whatsappLink("923249574895", "Hi & thanks")).toBe(
      "https://wa.me/923249574895?text=Hi%20%26%20thanks",
    );
  });
});
