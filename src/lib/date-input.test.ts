import { describe, expect, it } from "vitest";

import { getTodayForDateInput } from "./date-input";

describe("getTodayForDateInput", () => {
  it("formats a local date for input[type=date]", () => {
    const date = new Date(2026, 5, 15, 23, 59, 0);

    expect(getTodayForDateInput(date)).toBe("2026-06-15");
  });

  it("does not use an ISO UTC conversion that can shift the local day", () => {
    const date = new Date(2026, 0, 1, 0, 5, 0);

    expect(getTodayForDateInput(date)).toBe("2026-01-01");
  });
});
