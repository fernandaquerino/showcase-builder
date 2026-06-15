// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { ExtractionSource } from "@/lib/validations/extract";
import {
  normalizeExtractedPrice,
  normalizeExtractedProduct,
} from "./normalize";

describe("normalizeExtractedPrice", () => {
  it.each([
    ["R$ 199,90", "199.90"],
    ["199,90", "199.90"],
    ["1.299,90", "1299.90"],
    ["1299.90", "1299.90"],
    ["129", "129.00"],
    ["1.000", "1000.00"],
    ["0", "0.00"],
  ])("normalizes string %s", (input, expected) => {
    expect(normalizeExtractedPrice(input)).toBe(expected);
  });

  it("normalizes a numeric price", () => {
    expect(normalizeExtractedPrice(199.9)).toBe("199.90");
  });

  it.each(["-10", "abc", "", "  "])("rejects %s", (input) => {
    expect(normalizeExtractedPrice(input)).toBeNull();
  });

  it("rejects a negative number and null", () => {
    expect(normalizeExtractedPrice(-5)).toBeNull();
    expect(normalizeExtractedPrice(null)).toBeNull();
  });
});

function raw(overrides: Partial<Parameters<typeof normalizeExtractedProduct>[0]>) {
  return {
    name: null,
    imageUrl: null,
    price: null,
    color: null,
    sources: new Set<ExtractionSource>(),
    ...overrides,
  };
}

describe("normalizeExtractedProduct", () => {
  it("is complete with name and image", () => {
    const result = normalizeExtractedProduct(
      raw({
        name: "  Jaqueta   jeans ",
        imageUrl: "https://a/x.jpg",
        price: "199,90",
        color: "Azul",
        sources: new Set(["json-ld"]),
      }),
    );
    expect(result.name).toBe("Jaqueta jeans");
    expect(result.completeness).toBe("complete");
    expect(result.fieldsFound).toEqual(["name", "imageUrl", "price", "color"]);
    expect(result.extractionSource).toBe("json-ld");
  });

  it("is partial with only a name", () => {
    const result = normalizeExtractedProduct(raw({ name: "Só nome" }));
    expect(result.completeness).toBe("partial");
    expect(result.fieldsFound).toEqual(["name"]);
  });

  it("has null completeness when there is no name or image", () => {
    const result = normalizeExtractedProduct(raw({ price: "10,00" }));
    expect(result.completeness).toBeNull();
  });

  it("drops an invalid image url", () => {
    const result = normalizeExtractedProduct(
      raw({ name: "X", imageUrl: "javascript:alert(1)" }),
    );
    expect(result.imageUrl).toBeNull();
    expect(result.completeness).toBe("partial");
  });

  it("clamps the name to the schema limit", () => {
    const result = normalizeExtractedProduct(raw({ name: "a".repeat(200) }));
    expect(result.name).toHaveLength(160);
  });

  it("reports mixed when several sources contribute", () => {
    const result = normalizeExtractedProduct(
      raw({
        name: "X",
        imageUrl: "https://a/x.jpg",
        sources: new Set(["json-ld", "open-graph"]),
      }),
    );
    expect(result.extractionSource).toBe("mixed");
  });
});
