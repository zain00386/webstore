import { describe, expect, it } from "vitest";
import { getStockStatus } from "./stock";

describe("getStockStatus", () => {
  it("is out of stock at zero or below", () => {
    expect(getStockStatus(0, 3)).toBe("out_of_stock");
    expect(getStockStatus(-1)).toBe("out_of_stock");
  });

  it("is low stock at or under the threshold", () => {
    expect(getStockStatus(3, 3)).toBe("low_stock");
    expect(getStockStatus(1, 3)).toBe("low_stock");
  });

  it("never shows low stock without a threshold", () => {
    expect(getStockStatus(1)).toBe("in_stock");
    expect(getStockStatus(1, null)).toBe("in_stock");
    expect(getStockStatus(1, 0)).toBe("in_stock");
  });

  it("is in stock above the threshold", () => {
    expect(getStockStatus(4, 3)).toBe("in_stock");
  });
});
