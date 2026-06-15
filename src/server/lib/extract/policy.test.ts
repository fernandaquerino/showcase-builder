// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  cacheKindForError,
  computeWindowStartMs,
  expiresAtForCacheKind,
  isWithinLimit,
  retryAfterSeconds,
  ttlMsForCacheKind,
} from "./policy";

describe("cacheKindForError", () => {
  it("caches no-data results for a long time", () => {
    expect(cacheKindForError("NO_PRODUCT_DATA")).toBe("no-data");
  });

  it.each([
    "TIMEOUT",
    "UPSTREAM_BLOCKED",
    "NOT_FOUND",
    "EXTRACTION_FAILED",
  ] as const)("caches %s as a temporary error", (code) => {
    expect(cacheKindForError(code)).toBe("temporary-error");
  });

  it.each(["INVALID_URL", "HOST_NOT_ALLOWED", "RATE_LIMITED"] as const)(
    "does not cache %s",
    (code) => {
      expect(cacheKindForError(code)).toBeNull();
    },
  );
});

describe("ttl", () => {
  it("uses 24h for success and 10min for temporary errors", () => {
    expect(ttlMsForCacheKind("success")).toBe(24 * 60 * 60 * 1000);
    expect(ttlMsForCacheKind("no-data")).toBe(24 * 60 * 60 * 1000);
    expect(ttlMsForCacheKind("temporary-error")).toBe(10 * 60 * 1000);
  });

  it("computes a future expiry", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    expect(expiresAtForCacheKind("temporary-error", now).toISOString()).toBe(
      "2026-06-15T00:10:00.000Z",
    );
  });
});

describe("rate-limit math", () => {
  it("aligns the window start", () => {
    expect(computeWindowStartMs(125_000, 60_000)).toBe(120_000);
  });

  it("computes seconds until the next window", () => {
    expect(retryAfterSeconds(120_000, 60_000, 125_000)).toBe(55);
  });

  it("checks the limit inclusively", () => {
    expect(isWithinLimit(10, 10)).toBe(true);
    expect(isWithinLimit(11, 10)).toBe(false);
  });
});
