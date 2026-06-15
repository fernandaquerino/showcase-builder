import { describe, expect, it } from "vitest";

import {
  combineLiveDateAndTime,
  formatCountdownAccessible,
  getCountdownParts,
  getPublicLiveState,
} from "./public-live-state";

describe("public live state", () => {
  it("combines date and time in the configured timezone", () => {
    expect(
      combineLiveDateAndTime({
        liveDate: "2026-06-15",
        liveTime: "20:00",
        timeZone: "America/Sao_Paulo",
      })?.toISOString(),
    ).toBe("2026-06-15T23:00:00.000Z");
  });

  it("returns scheduled before the live starts", () => {
    expect(
      getPublicLiveState(
        { liveDate: "2026-06-15", liveTime: "20:00" },
        new Date("2026-06-15T22:59:59.000Z"),
      ),
    ).toBe("scheduled");
  });

  it("returns live during the configured live window", () => {
    expect(
      getPublicLiveState(
        { liveDate: "2026-06-15", liveTime: "20:00" },
        new Date("2026-06-16T00:30:00.000Z"),
      ),
    ).toBe("live");
  });

  it("returns finished once the live window ends", () => {
    expect(
      getPublicLiveState(
        { liveDate: "2026-06-15", liveTime: "20:00" },
        new Date("2026-06-16T01:00:00.000Z"),
      ),
    ).toBe("finished");
  });

  it("returns undated without a complete date and time", () => {
    expect(getPublicLiveState({ liveDate: null, liveTime: "20:00" })).toBe(
      "undated",
    );
    expect(getPublicLiveState({ liveDate: "2026-06-15", liveTime: null })).toBe(
      "undated",
    );
  });

  it("formats countdown parts without negative values", () => {
    expect(
      getCountdownParts(
        new Date("2026-06-16T01:00:00.000Z"),
        new Date("2026-06-15T20:41:18.000Z"),
      ),
    ).toEqual({ days: 0, hours: 4, minutes: 18, seconds: 42 });

    expect(
      getCountdownParts(
        new Date("2026-06-15T20:00:00.000Z"),
        new Date("2026-06-15T20:00:01.000Z"),
      ),
    ).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("builds stable accessible countdown text", () => {
    expect(
      formatCountdownAccessible({
        days: 2,
        hours: 4,
        minutes: 18,
        seconds: 42,
      }),
    ).toBe("A live começa em 2 dias, 4 horas, 18 minutos.");
    expect(
      formatCountdownAccessible({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 20,
      }),
    ).toBe("A live começa em menos de 1 minuto.");
  });
});
