import { describe, expect, it } from "vitest";

import { formatLiveDate, formatLiveTime, formatTimestamp } from "./format";

describe("formatLiveDate", () => {
  it("formats an ISO date as DD/MM/YYYY without timezone drift", () => {
    expect(formatLiveDate("2026-06-20")).toBe("20/06/2026");
  });

  it("returns the original value when the shape is unexpected", () => {
    expect(formatLiveDate("20/06/2026")).toBe("20/06/2026");
  });
});

describe("formatLiveTime", () => {
  it("returns the HH:mm slice", () => {
    expect(formatLiveTime("20:00")).toBe("20:00");
    expect(formatLiveTime("20:00:00")).toBe("20:00");
  });

  it("returns null when absent", () => {
    expect(formatLiveTime(null)).toBeNull();
  });
});

describe("formatTimestamp", () => {
  it("formats a Date in Brazilian format", () => {
    expect(formatTimestamp(new Date("2026-06-15T12:00:00Z"))).toBe(
      "15/06/2026",
    );
  });
});
