import { describe, expect, it } from "vitest";
import { getShopStatus } from "./store-hours";

// Pakistan is UTC+5, so 05:00Z = 10:00 PKT.
describe("getShopStatus", () => {
  it("is open on Saturday at 10:00 PKT", () => {
    expect(getShopStatus(new Date("2026-10-17T05:00:00Z"))).toEqual({ open: true });
  });

  it("is closed before 10:00 and from 21:00 PKT", () => {
    expect(getShopStatus(new Date("2026-10-17T04:59:00Z"))).toEqual({
      open: false,
      reason: "before-open",
    });
    expect(getShopStatus(new Date("2026-10-17T16:00:00Z"))).toEqual({
      open: false,
      reason: "after-close",
    });
  });

  it("is closed all day Friday", () => {
    expect(getShopStatus(new Date("2026-10-16T08:00:00Z"))).toEqual({
      open: false,
      reason: "closed-day",
    });
  });

  it("uses Pakistan time, not UTC, for the day", () => {
    // Thursday 20:00 UTC is Friday 01:00 in Pakistan.
    expect(getShopStatus(new Date("2026-10-15T20:00:00Z"))).toEqual({
      open: false,
      reason: "closed-day",
    });
  });
});
