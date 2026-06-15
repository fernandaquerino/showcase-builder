import { describe, expect, it } from "vitest";

import { formatBrlPrice, parseBrlPrice } from "@/lib/price";

describe("parseBrlPrice", () => {
  it.each([
    ["99,90", "99.90"],
    ["1.299,90", "1299.90"],
    ["129", "129.00"],
    ["0,99", "0.99"],
    ["R$ 199,90", "199.90"],
    ["1.000", "1000.00"],
    ["5,5", "5.50"],
  ])("parses %s as %s", (input, expected) => {
    expect(parseBrlPrice(input)).toEqual({ kind: "valid", value: expected });
  });

  it("treats an empty string as empty", () => {
    expect(parseBrlPrice("")).toEqual({ kind: "empty" });
    expect(parseBrlPrice("   ")).toEqual({ kind: "empty" });
  });

  it.each(["-10", "abc", "12,3,4", "12,345", "10,"])("rejects %s", (input) => {
    expect(parseBrlPrice(input)).toEqual({ kind: "invalid" });
  });
});

describe("formatBrlPrice", () => {
  it.each([
    ["199.90", "R$ 199,90"],
    ["1299.90", "R$ 1.299,90"],
    ["129.00", "R$ 129,00"],
    ["0.99", "R$ 0,99"],
    ["1000000.00", "R$ 1.000.000,00"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatBrlPrice(input)).toBe(expected);
  });

  it("returns null for null", () => {
    expect(formatBrlPrice(null)).toBeNull();
  });
});
