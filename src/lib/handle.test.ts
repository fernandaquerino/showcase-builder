import { describe, expect, it } from "vitest";

import { normalizeHandle } from "./handle";

describe("normalizeHandle", () => {
  it("normalizes a simple name", () => {
    expect(normalizeHandle("Fernanda")).toBe("fernanda");
  });

  it("removes accents", () => {
    expect(normalizeHandle("Júlia Coração")).toBe("julia-coracao");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeHandle("  Ana   Maria  ")).toBe("ana-maria");
  });

  it("removes invalid characters", () => {
    expect(normalizeHandle("@bia.live!")).toBe("bialive");
  });

  it("returns an empty string for an empty value", () => {
    expect(normalizeHandle("")).toBe("");
  });

  it("limits the result to 30 characters", () => {
    expect(normalizeHandle("a".repeat(40))).toHaveLength(30);
  });
});
