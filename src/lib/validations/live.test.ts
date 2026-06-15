import { describe, expect, it } from "vitest";

import { liveInputSchema } from "./live";

const validInput = {
  title: "  Live de Inverno  ",
  subtitle: "",
  store: "C&A",
  liveDate: "2026-06-20",
  liveTime: "20:00",
  platform: "Instagram",
  slug: "Live de Inverno",
};

describe("liveInputSchema", () => {
  it("accepts and normalizes a valid payload", () => {
    const result = liveInputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Live de Inverno",
        subtitle: null,
        store: "C&A",
        liveDate: "2026-06-20",
        liveTime: "20:00",
        platform: "Instagram",
        slug: "live-de-inverno",
      });
    }
  });

  it("normalizes optional empty fields to null", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      subtitle: "   ",
      liveTime: "",
      platform: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subtitle).toBeNull();
      expect(result.data.liveTime).toBeNull();
      expect(result.data.platform).toBeNull();
    }
  });

  it("rejects a short title", () => {
    const result = liveInputSchema.safeParse({ ...validInput, title: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty store", () => {
    const result = liveInputSchema.safeParse({ ...validInput, store: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid calendar date", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      liveDate: "2026-02-30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date string", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      liveDate: "20/06/2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid time", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      liveTime: "25:00",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes a slug with spaces and uppercase", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      slug: "Minha   Live!!!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("minha-live");
    }
  });

  it("rejects a title above the limit", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      title: "a".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("ignores a client-supplied userId", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      userId: "attacker-controlled",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect("userId" in result.data).toBe(false);
    }
  });
});
