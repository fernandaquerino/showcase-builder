// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { ExtractionSource } from "@/lib/validations/extract";
import {
  normalizeExtractedPrice,
  normalizeExtractedProduct,
  type RawProductMetadata,
} from "./normalize";

describe("normalizeExtractedPrice", () => {
  it.each([
    ["R$ 199,90", "199.90"],
    ["1.299,90", "1299.90"],
    ["1299.90", "1299.90"],
    ["129", "129.00"],
    ["1.000", "1000.00"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeExtractedPrice(input)).toBe(expected);
  });

  it.each(["-10", "abc", "", "  "])("rejects %s", (input) => {
    expect(normalizeExtractedPrice(input)).toBeNull();
  });
});

function raw(overrides: Partial<RawProductMetadata> = {}): RawProductMetadata {
  return {
    canonicalUrl: null,
    sku: null,
    name: null,
    imageUrl: null,
    price: null,
    color: null,
    category: null,
    brand: null,
    availableSizes: [],
    sources: new Set<ExtractionSource>(),
    ...overrides,
  };
}

describe("normalizeExtractedProduct", () => {
  it("normalizes all additional fields and removes duplicate sizes", () => {
    const result = normalizeExtractedProduct(
      raw({
        canonicalUrl:
          "https://LOJA.exemplo.com/p/1?variant=preto&utm_campaign=criadora",
        sku: " SKU-1 ",
        name: "  Jaqueta   jeans &amp; sarja ",
        imageUrl: "https://a/x.jpg",
        price: "199,90",
        color: " Preto&nbsp;intenso ",
        category: " Jaquetas ",
        brand: " C&amp;A ",
        availableSizes: ["PP", "P", "p", " M "],
        sources: new Set(["json-ld", "breadcrumb"]),
      }),
    );

    expect(result).toMatchObject({
      canonicalUrl: "https://loja.exemplo.com/p/1?variant=preto",
      sku: "SKU-1",
      name: "Jaqueta jeans & sarja",
      price: "199.90",
      color: "Preto intenso",
      category: "Jaquetas",
      brand: "C&A",
      availableSizes: ["PP", "P", "M"],
      completeness: "complete",
      extractionSource: "mixed",
    });
    expect(result.fieldsFound).toEqual([
      "name",
      "imageUrl",
      "price",
      "color",
      "category",
      "brand",
      "sku",
      "availableSizes",
    ]);
  });

  it("is partial with only a name and null without name or image", () => {
    expect(normalizeExtractedProduct(raw({ name: "Nome" })).completeness).toBe(
      "partial",
    );
    expect(
      normalizeExtractedProduct(raw({ price: "10.00" })).completeness,
    ).toBeNull();
  });

  it("drops unsafe image and canonical URLs", () => {
    const result = normalizeExtractedProduct(
      raw({
        name: "X",
        imageUrl: "javascript:alert(1)",
        canonicalUrl: "file:///etc/passwd",
      }),
    );
    expect(result.imageUrl).toBeNull();
    expect(result.canonicalUrl).toBeNull();
  });
});
