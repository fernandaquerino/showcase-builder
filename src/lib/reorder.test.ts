import { describe, expect, it } from "vitest";

import { isValidReorder } from "@/lib/reorder";

const A = "a";
const B = "b";
const C = "c";

describe("isValidReorder", () => {
  it("accepts a valid permutation", () => {
    expect(isValidReorder([A, B, C], [C, A, B])).toBe(true);
  });

  it("accepts the same order", () => {
    expect(isValidReorder([A, B, C], [A, B, C])).toBe(true);
  });

  it("accepts two empty lists", () => {
    expect(isValidReorder([], [])).toBe(true);
  });

  it("rejects duplicated ids", () => {
    expect(isValidReorder([A, B, C], [A, A, B])).toBe(false);
  });

  it("rejects a missing id", () => {
    expect(isValidReorder([A, B, C], [A, B])).toBe(false);
  });

  it("rejects an extra id", () => {
    expect(isValidReorder([A, B], [A, B, C])).toBe(false);
  });

  it("rejects an id from another live", () => {
    expect(isValidReorder([A, B], [A, "foreign"])).toBe(false);
  });
});
