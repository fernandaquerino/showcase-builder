import { describe, expect, it } from "vitest";

import { liveInputSchema } from "./live";

const validInput = {
  title: "  Live de Inverno  ",
  liveDate: "2026-06-20",
  liveTime: "20:00",
  coverImageUrl: "https://cdn.exemplo.com/live.jpg",
  instagramUrl: "https://www.instagram.com/criadora",
  slug: "Live de Inverno",
};

describe("liveInputSchema", () => {
  it("accepts and normalizes a valid payload", () => {
    const result = liveInputSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        title: "Live de Inverno",
        liveDate: "2026-06-20",
        liveTime: "20:00",
        coverImageUrl: "https://cdn.exemplo.com/live.jpg",
        instagramUrl: "https://www.instagram.com/criadora",
        slug: "live-de-inverno",
      });
    }
  });

  it("normalizes optional empty fields to null", () => {
    const result = liveInputSchema.safeParse({
      ...validInput,
      liveTime: "",
      coverImageUrl: "",
      instagramUrl: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.liveTime).toBeNull();
      expect(result.data.coverImageUrl).toBeNull();
      expect(result.data.instagramUrl).toBeNull();
    }
  });

  it("rejects unsafe optional URLs", () => {
    expect(
      liveInputSchema.safeParse({
        ...validInput,
        coverImageUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      liveInputSchema.safeParse({
        ...validInput,
        instagramUrl: "https://example.com/profile",
      }).success,
    ).toBe(false);
  });

  it("rejects a short title", () => {
    const result = liveInputSchema.safeParse({ ...validInput, title: "ab" });
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
