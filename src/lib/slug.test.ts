import { describe, expect, it } from "vitest";

import { appendSuffix, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases the value", () => {
    expect(slugify("Looks")).toBe("looks");
  });

  it("removes accents", () => {
    expect(slugify("Live C&A · Pam Braga")).toBe("live-c-a-pam-braga");
  });

  it("keeps numbers", () => {
    expect(slugify("Looks de Inverno 2026")).toBe("looks-de-inverno-2026");
  });

  it("collapses multiple spaces and strips special characters", () => {
    expect(slugify("  Minha   Live!!! ")).toBe("minha-live");
  });

  it("collapses duplicate hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("treats underscores as separators", () => {
    expect(slugify("minha_live")).toBe("minha-live");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-minha-live-")).toBe("minha-live");
  });

  it("limits the length to 80 characters", () => {
    expect(slugify("a".repeat(120)).length).toBeLessThanOrEqual(80);
  });

  it("returns a safe fallback for an empty result", () => {
    expect(slugify("!!!")).toBe("live");
    expect(slugify("")).toBe("live");
  });

  it("keeps an already valid slug unchanged", () => {
    expect(slugify("live-de-inverno")).toBe("live-de-inverno");
  });
});

describe("appendSuffix", () => {
  it("appends a numeric suffix", () => {
    expect(appendSuffix("minha-live", 2)).toBe("minha-live-2");
    expect(appendSuffix("minha-live", 3)).toBe("minha-live-3");
  });

  it("keeps the result within the length limit", () => {
    const base = "a".repeat(80);
    expect(appendSuffix(base, 10).length).toBeLessThanOrEqual(80);
  });

  it("avoids double hyphens when truncating", () => {
    expect(appendSuffix("minha-live-", 2)).not.toContain("--");
  });
});
