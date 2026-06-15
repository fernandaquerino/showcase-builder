import { describe, expect, it } from "vitest";

import {
  productInputSchema,
  reorderProductsSchema,
} from "@/lib/validations/product";

const validInput = {
  name: "Jaqueta jeans oversized",
  category: "Jaquetas",
  size: "M",
  color: "Azul claro",
  imageUrl: "https://exemplo.com/imagem.jpg",
  productUrl: "https://loja.com/produto",
  price: "199,90",
};

describe("productInputSchema", () => {
  it("normalizes a valid product", () => {
    const result = productInputSchema.parse(validInput);

    expect(result).toEqual({
      name: "Jaqueta jeans oversized",
      category: "Jaquetas",
      size: "M",
      color: "Azul claro",
      imageUrl: "https://exemplo.com/imagem.jpg",
      productUrl: "https://loja.com/produto",
      price: "199.90",
      sourceUrl: null,
    });
  });

  it("keeps a valid sourceUrl and rejects an unsafe one", () => {
    const ok = productInputSchema.safeParse({
      ...validInput,
      sourceUrl: "https://minhacea.cea.com.br/?lcea=ABC",
    });
    expect(ok.success).toBe(true);

    const bad = productInputSchema.safeParse({
      ...validInput,
      sourceUrl: "javascript:alert(1)",
    });
    expect(bad.success).toBe(false);
  });

  it("turns empty optional fields into null", () => {
    const result = productInputSchema.parse({
      ...validInput,
      size: "",
      color: "   ",
      price: "",
    });

    expect(result.size).toBeNull();
    expect(result.color).toBeNull();
    expect(result.price).toBeNull();
  });

  it("rejects an empty name", () => {
    const result = productInputSchema.safeParse({ ...validInput, name: " " });
    expect(result.success).toBe(false);
  });

  it("rejects an empty category", () => {
    const result = productInputSchema.safeParse({
      ...validInput,
      category: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name over the limit", () => {
    const result = productInputSchema.safeParse({
      ...validInput,
      name: "a".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "not-a-url",
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "ftp://example.com/x.jpg",
  ])("rejects unsafe image url %s", (imageUrl) => {
    const result = productInputSchema.safeParse({ ...validInput, imageUrl });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe product url", () => {
    const result = productInputSchema.safeParse({
      ...validInput,
      productUrl: "javascript:void(0)",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid Brazilian price", () => {
    const result = productInputSchema.parse({
      ...validInput,
      price: "1.299,90",
    });
    expect(result.price).toBe("1299.90");
  });

  it.each(["-10", "abc", "12,3,4"])("rejects invalid price %s", (price) => {
    const result = productInputSchema.safeParse({ ...validInput, price });
    expect(result.success).toBe(false);
  });

  it("ignores client-supplied position and ids", () => {
    const result = productInputSchema.parse({
      ...validInput,
      position: 99,
      liveId: "attacker",
      id: "attacker",
    });

    expect(result).not.toHaveProperty("position");
    expect(result).not.toHaveProperty("liveId");
    expect(result).not.toHaveProperty("id");
  });
});

describe("reorderProductsSchema", () => {
  it("accepts an array of uuids", () => {
    const result = reorderProductsSchema.safeParse({
      orderedProductIds: [
        "11111111-1111-4111-a111-111111111111",
        "22222222-2222-4222-a222-222222222222",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty array", () => {
    const result = reorderProductsSchema.safeParse({ orderedProductIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid ids", () => {
    const result = reorderProductsSchema.safeParse({
      orderedProductIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });
});
